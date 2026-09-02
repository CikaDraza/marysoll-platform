# Loyalty Engine — current state (operativni ugovor)

> Status: **u produkcijskom kodu i u upotrebi.** Ovo NIJE roadmap dokument.
> Opisuje šta danas radi, ko je authority i gde je granica prema sledećem
> rezu. Provereno nad kodom 2026-09-03, grana `staging/production-engines`.
>
> Roadmap i vizija: [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md#loyalty-engine--v2-vizija-i-stvarno-stanje) ·
> redosled rada: [TODO.md](TODO.md) ·
> buduća admin IA: [PANTA-GROWTH-STUDIO.md](PANTA-GROWTH-STUDIO.md)

## 1. Jedna rečenica

**EARNING i CORRECTION postoje i rade. REDEMPTION koju klijentkinja sama bira
ne postoji — to je T1-4.**

## 2. Granica koda

```text
packages/loyalty-engine/      čist domen bez I/O: currency format, streak,
                              referral gate, voucher kod, popust
src/lib/loyalty/              application sloj: config, events, engine (pravila),
                              ledger, accounts, vouchers, hooks, notifications, cron
src/models/                   LoyaltyConfig · LoyaltyAccount · LoyaltyLedger ·
                              LoyaltyEvent · Voucher · Referral
src/app/api/loyalty/**        admin i client rute
src/components/admin/loyalty/ admin UI (danas nosi ime AdminGrowthStudio — §12)
src/components/loyalty/       klijentski celebration/moments UI
```

Poslovna pravila ne žive u React komponentama. Balans se ne računa u browseru.

## 3. Gate — šta uopšte uključuje Loyalty

Dva uslova moraju biti ispunjena istovremeno:

| uslov | izvor |
|---|---|
| capability `loyalty.rewards` | `TENANT_CAPABILITY_REGISTRY` → plan feature `loyaltyCore` |
| `LoyaltyConfig.enabled === true` | tenant je program stvarno uključio |

```text
loyaltyCore      maria=false · claudia=true · kiki=true · enterprise=true
loyaltySystem    kiki+        (napredni loyalty)
loyaltyRevenue   enterprise   (revenue analitika nad loyalty-jem)
```

Superadmin feature override ima prednost nad podrazumevanim planom: uključena
funkcija na Free/Maria tenantu **jeste** aktivna capability. To je namerna
poslovna odluka, ne rupa.

Salon bez programa ne dobija lažni zero-state — sekcija se ne prikazuje.

## 4. Dve valute

| valuta | kako se zarađuje | značenje |
|---|---|---|
| **srca** (`hearts`) | `earning.heartsPerCompletedVisit` po završenoj poseti | punch-card: sakupi N → nagrada |
| **poeni** (`points`) | `currencies.points.per100Rsd` po 100 RSD potrošnje; `earning.checkinPoints` po QR check-inu; `earning.welcomeBonusPoints` pri registraciji | valuta za buduću razmenu |

Nazivi, emoji i uključenost svake valute su per-tenant (`currencies`).

**Potrošnja** (`hooks.ts`) ima namerni redosled: `finalPrice` (posle vaučera) →
`chargedAmount` (stvarno naplaćeno) → legacy numerička cena. Nepoznata cena daje
**0 potrošnje, ne 0 dinara prihoda** — bodovi se ne dodeljuju dok se cena ne
sazna. Vidi [cene §1](PANTA-BOOKING-PRICING.md).

## 5. Ledger je jedini authority za balans

`LoyaltyLedger` je knjiga; `LoyaltyAccount.heartsBalance/pointsBalance` je
projekcija koju ledger unos pomera.

- idempotencija: `evt:{eventId}:{ruleId}` — jedan događaj × jedno pravilo =
  najviše jedan unos, pa je ponovna obrada no-op;
- anti-abuse: `antiAbuse.maxHeartsPerDay` / `maxPointsPerDay` ograničavaju
  dnevni priliv;
- tipovi unosa: `earn`, `redeem`, `adjust`, `revoke`, `expire`.

> **Poznat dug (ne popravlja se ovde):** `completedVisits`, `totalSpend` i
> `currentStreak` su informativni brojači van ledger zaštite. Redak retry posle
> parcijalnog pada može da ih duplira i rekonsilijacija ih ne ispravlja. Balansi
> su ledger-zaštićeni i time nisu ugroženi. Provera postoji kao read-only
> integrity check (`loyalty.balance.mismatch`, `loyalty.ledger.mismatch`) —
> [Identity & Loyalty Health](PANTA-IDENTITY-LOYALTY-HEALTH.md).

## 6. Događaji

`LoyaltyEvent` je durable red (`pending → processed | failed | skipped`); pravila
se primenjuju iz registra u `engine.ts`:

```text
appointment_completed             srca po poseti + poeni po potrošnji + milestone
appointment_no_show               noShowPolicy
appointment_completion_reverted   povlačenje zarade i izdatih vaučera
client_registered                 welcome bonus
client_checkin                    check-in poeni + check-in streak
referral_completed                nagrada posle hard-gate-a
manual_adjustment                 audit trag admin korekcije
```

Termin nikad ne zove pravila direktno: `hooks.ts` prevodi promenu statusa
termina u događaj.

## 7. Milestone — automatska nagrada JESTE implementirana

Kad broj srca dostigne `milestones[0].heartsRequired`, engine u istom toku:

1. knjiži `redeem` unos (srca se troše),
2. izdaje vaučer (`origin: "auto_rule"`, idempotentno po događaju),
3. šalje celebration notifikaciju sa kodom vaučera.

Ovo je **zarada koja se sama pretvara u nagradu** i deo je postojećeg sistema.
T1-4 ne pravi ovo.

## 8. Voucher lifecycle

```text
active ──(booking sa kodom)──▶ reserved ──(termin completed)──▶ redeemed
   ▲                              │
   └────(otkazivanje/odbijanje)───┘        revert completion: redeemed → reserved/active
active ──(istekao, cron)──▶ expired        revert termina: active/reserved → revoked
```

- sve tranzicije su CAS (`findOneAndUpdate` sa uslovom nad statusom), bez
  multi-doc transakcija: od dva konkurentna bookinga istim kodom prolazi tačno
  jedan;
- primena pri zakazivanju postoji na `POST /api/appointments/create` kroz polje
  `voucherCode`; popust se računa **server-side** nad canonical iznosom iz
  kataloga, ne nad zbirom koji je poslao browser;
- kod `on_request` cene vaučer ostaje **rezervisan** i čeka quote — vidi
  [cene §4](PANTA-BOOKING-PRICING.md);
- `expireDueVouchers` ističe vaučere kroz loyalty cron.

**Ograničenje današnjeg toka:** kod stiže iz deep-linka (referral/share vaučer u
`?voucher=` ili `PendingAppointment`), a ne iz izbora klijentkinje. Ne postoji
ekran na kome ona bira jedan od svojih aktivnih vaučera. To je T1-4.

## 9. Streak, no-show i check-in

Dva odvojena streak-a, namerno:

| polje | šta broji |
|---|---|
| `currentStreak` | completion-driven, uvećava se uz svaku završenu posetu |
| `checkinStreak` / `longestCheckinStreak` / `lastCheckinAt` | QR check-in navika, `streak.windowDays` (default 45) |

Check-in je aditivan i ne dira zatečeno ponašanje salona.

> **`streak.windowDays` (default 45) pripada ISKLJUČIVO check-in streak-u.**
> „🔥 vatrica" se resetuje kad prođe toliko dana bez QR check-ina.
> Completion-driven `currentStreak` je zaseban brojač koji raste uz svaku
> završenu posetu i ne koristi taj prozor. Ne spajati ih u jednu tvrdnju.

`noShowPolicy.mode`:

```text
none            beleži se činjenica, bez posledice
streak_reset    completion-driven `currentStreak` pada na nulu
hearts_penalty  isti reset + oduzimanje `heartsPenalty` srca (`revoke` ledger unos)
```

Nedolazak uvek uvećava `noShows`. Politika dira **`currentStreak`**, ne
check-in streak.

`late_cancel` i stvarni nedolazak imaju **istu posledicu**; razlog se čuva
odvojeno (`noShowReason`) da bi politika kasnije mogla da se razdvoji bez gubitka
istorije — [otkazivanje](PANTA-CANCELLATION-NOSHOW-POLICY.md).

## 10. Admin korekcija balansa — postoji

`POST /api/loyalty/admin/accounts/[id]/adjust`

```text
currency: "hearts" | "points"
amount:   ceo broj ≠ 0
reason:   obavezan, 3–300 znakova
```

Rezultat je `adjust` unos u ledgeru, `manual_adjustment` audit događaj i
notifikacija klijentkinji. Nema drugog puta za ručnu izmenu balansa i ne postoji
checkbox „iskorišćeno".

## 11. Šta klijentkinja već vidi

- `/api/loyalty/client/me` — stanje, valute, milestone napredak, `pointsShop`
  konfiguracija (prikaz, ne kupovina);
- `/api/loyalty/client/vouchers` i `/ledger` — njeni vaučeri i istorija;
- `/api/loyalty/client/moments` + `LoyaltyMoments` / `LoyaltyCelebrationOverlay`
  — **celebration animacija posle završene posete**: šta je zaradila, koliko još
  do nagrade, kod dobijenog vaučera. Moment se pušta pri sledećem otvaranju
  panela/sajta jer klijentkinja nije prisutna u trenutku kad salon označi dolazak;
  push notifikacija stiže odmah. Jačina je per-tenant (`celebration.intensity`).

Ovo je **postojeće ponašanje** i ne planira se ponovo u T1-4.

## 12. Referral

`Referral` model + hard gate `evaluateReferralCompletion` (registracija →
rezervacija → završena poseta) i `share-voucher` ruta postoje u kodu. Nagrada se
knjiži tek kad gate prođe; neuspeh gasi referral sa `failureReason`. Live QA nad
stvarnim salonom nije zatvoren — vodi se u [TODO.md](TODO.md).

## 13. Client 360 projekcija

Dosije klijentkinje čita loyalty kao **read model**, ne kao drugi izvor istine:
stanje naloga, poslednjih 10 ledger događaja, vaučeri sa lifecycle-om i vezanim
terminom, plus ista admin adjust komanda iz §10. Ugovor:
[PANTA-CLIENT-360.md](PANTA-CLIENT-360.md).

## 14. T1-4 — NEXT, nije implementirano

**T1-4 Loyalty Redemption & Appointment Checkout.**

Zaključan smer (odluka stoji, implementacija ne postoji):

```text
poeni → konfigurisana points-shop nagrada → vaučer
      → primena na termin → redeemed na completed
```

Ne postoji u kodu: komanda/ruta koja troši poene, ekran na kome klijentkinja
bira nagradu ili svoj vaučer pri zakazivanju, pravila stackovanja vaučera i
poena, admin potvrda i trenutak skidanja balansa kod otkazivanja.

Ne postoji proizvoljan kurs „30 poena = X RSD"; `pointsShop` u konfiguraciji je
lista nagrada, ne kurs. Milestone iz §7 se **ne pretvara** u direktnu potrošnju
srca bez nove product odluke.

Kontrolni tracker: [TODO.md](TODO.md).

## 15. T1-5 — DEFERRED

Salonski paketi/pretplate klijentkinje (`ClientPackage`, entitlement, payment
provider) nisu deo Loyalty domena i ostaju odloženi. `Service.subscription` samo
opisuje šta salon nudi i nije dokaz da je klijentkinja nešto kupila.

## 16. Naziv „Growth Studio"

`AdminGrowthStudio.tsx` je **danas Loyalty UI** i to ostaje tako. Podela u
[PANTA-GROWTH-STUDIO.md](PANTA-GROWTH-STUDIO.md) (Nagrađivanje vs Growth Studio
za distribuciju) je **FUTURE IA odluka**; preimenovanje koda nije zakazano i nije
preduslov ni za jedan otvoreni rez.
