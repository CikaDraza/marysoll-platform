# Loyalty Engine — current state (operativni ugovor)

> Status: **u produkcijskom kodu i u upotrebi.** Ovo NIJE roadmap dokument.
> Opisuje šta danas radi, ko je authority i gde je granica prema sledećem
> rezu. Provereno nad kodom 2026-09-03; redemption sloj (T1-4) je verifikovan
> na grani `feature/t1-4-loyalty-redemption-checkout`.
>
> Roadmap i vizija: [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md#loyalty-engine--v2-vizija-i-stvarno-stanje) ·
> redosled rada: [TODO.md](TODO.md) ·
> buduća admin IA: [PANTA-GROWTH-STUDIO.md](PANTA-GROWTH-STUDIO.md)

## 1. Jedna rečenica

**EARNING, CORRECTION i REDEMPTION postoje i rade.** Klijentkinja sada sama
bira pogodnost za svoj termin — svoj vaučer ili konfigurisanu points-shop
nagradu — a završetak termina je račun, ne gola promena statusa (T1-4, §14).

## 2. Granica koda

```text
packages/loyalty-engine/      čist domen bez I/O: currency format, streak,
                              referral gate, voucher kod, popust
src/lib/loyalty/              application sloj: config, events, engine (pravila),
                              ledger, accounts, vouchers, hooks, notifications, cron
src/models/                   LoyaltyConfig · LoyaltyAccount · LoyaltyLedger ·
                              LoyaltyEvent · Voucher · Referral
src/app/api/loyalty/**        admin i client rute
src/app/api/appointments/[id]/benefits    izbor pogodnosti (klijent + admin)
src/app/api/appointments/[id]/checkout    pregled računa i završetak termina
src/components/admin/loyalty/ admin UI (danas nosi ime AdminGrowthStudio — §16)
src/components/loyalty/       klijentski celebration/moments UI + benefit picker
```

Redemption ima **jedan** server autoritet: `src/lib/loyalty/redemption.ts`
(izbor, primena, kupovina, uklanjanje, recompute) i
`src/lib/appointments/checkout.ts` (račun i završetak). Klijentski i admin UI
zovu isti seam; da su se razišli, dva panela bi vremenom dobila dva različita
skupa pravila.

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

**Potrošnja** (`hooks.ts`) ima namerni redosled: `pricing.chargedAmount`
(stvarno naplaćeno) → `finalPrice` (za naplatu posle vaučera) → canonical
realized fallback. Nepoznata cena daje **0 potrošnje, ne 0 dinara prihoda** —
bodovi se ne dodeljuju dok se cena ne sazna. Vidi
[cene §1](PANTA-BOOKING-PRICING.md).

> **Zašto je `chargedAmount` prvi (T1-4).** Do tada je `finalPrice` imao
> prednost, pa je uneto „stvarno naplaćeno" gubilo od vaučerske aritmetike:
> dogovoreno 3.200, naplaćeno 3.000, a poeni išli na 3.200. Appointment
> Checkout sada eksplicitno razlikuje „za naplatu" i „stvarno naplaćeno", pa i
> knjiženje mora — poeni se zarađuju na STVARNOJ potrošnji posle pogodnosti.

## 5. Ledger je jedini authority za balans

`LoyaltyLedger` je knjiga; `LoyaltyAccount.heartsBalance/pointsBalance` je
projekcija koju ledger unos pomera.

- idempotencija: `evt:{eventId}:{ruleId}` — jedan događaj × jedno pravilo =
  najviše jedan unos, pa je ponovna obrada no-op; points-shop kupovina koristi
  `points-shop:{appointmentId}:{offerId}` (§14);
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

Ovo je **zarada koja se sama pretvara u nagradu**: srca troši pravilo, ne
klijentkinja. Redemption iz §14 je odvojen tok — tamo se troše poeni, i to
samo kroz konfigurisanu ponudu.

## 8. Voucher lifecycle

```text
active ──(booking sa kodom)──▶ reserved ──(termin completed)──▶ redeemed
   ▲                              │
   └────(otkazivanje/odbijanje)───┘        revert completion: redeemed → reserved/active
active ──(istekao, cron)──▶ expired        revert termina: active/reserved → revoked
```

- sve tranzicije su CAS (`findOneAndUpdate` sa uslovom nad statusom): od dva
  konkurentna pokušaja istim vaučerom prolazi tačno jedan;
- **tri ulaza** vode do `reserved`, svi kroz isti server obračun:
  `voucherCode` pri zakazivanju (`POST /api/appointments/create`), izbor
  sopstvenog vaučera na već zakazanom terminu i points-shop kupovina
  (`POST /api/appointments/[id]/benefits`);
- kod `on_request` cene vaučer ostaje **rezervisan** i čeka quote; čim cena
  postane poznata, iznos se **ponovo računa na serveru** — vidi
  [cene §4](PANTA-BOOKING-PRICING.md);
- `expireDueVouchers` ističe vaučere kroz loyalty cron.

**Otkazivanje, odbijanje i nedolazak** vraćaju vaučer u `active` — uključujući
points-shop vaučer. Poeni se pri tome **ne refundiraju**: klijentkinja ih je
zamenila za stvarnu vrednost koju i dalje poseduje i sme da odnese na drugi
termin. Refund bi značio da isti poeni postoje dvaput — i kao saldo i kao
vaučer.

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
  konfiguracija;
- `GET /api/appointments/[id]/benefits` — šta sme da iskoristi na konkretnom
  terminu; posle uspešnog zakazivanja to postaje zaseban ekran (§14);
- `/api/loyalty/client/vouchers` i `/ledger` — njeni vaučeri i istorija;
- `/api/loyalty/client/moments` + `LoyaltyMoments` / `LoyaltyCelebrationOverlay`
  — **celebration animacija posle završene posete**: šta je zaradila, koliko još
  do nagrade, kod dobijenog vaučera. Moment se pušta pri sledećem otvaranju
  panela/sajta jer klijentkinja nije prisutna u trenutku kad salon označi dolazak;
  push notifikacija stiže odmah. Jačina je per-tenant (`celebration.intensity`).

Celebration sloj je **postojeće ponašanje**; T1-4 ga koristi takav kakav je i
ne uvodi drugi animation/event sistem.

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

## 14. Redemption i Appointment Checkout (T1-4) — u kodu

> Status: **kod je gotov i verifikovan mašinski** (typecheck, lint, testovi,
> build). Browser acceptance nad Marysoll salonom je zaseban red u
> [TODO.md](TODO.md) i nije zatvoren.

### 14.1 Šta se troši, a šta ne

```text
❤️ srca    punch-card napredak. NE troše se ručno — troši ih milestone
           pravilo (§7). Nema heart shopa i nema konverzije u dinare.
⭐ poeni    JEDINA valuta koju klijentkinja troši, i to isključivo kroz
           konfigurisanu points-shop ponudu.
🔥 streak   nije valuta i nema veze sa redemption-om.
```

Ne postoji kurs „30 poena = X RSD", slobodan unos („potroši 327 poena") ni
slider. Ponuda je jedina jedinica kupovine:

```text
500 ⭐ → 500 RSD popusta        800 ⭐ → 20% popusta
```

### 14.2 Vaučer je jedini monetarni benefit koji termin poznaje

```text
points-shop ponuda ──▶ skidanje poena ──▶ Voucher(origin: "points_shop")
                                      ──▶ reserved na terminu
```

`Appointment` i dalje zna samo `appliedVoucherId`, `originalPrice`,
`discountAmount`, `finalPrice`. Nema `appliedPoints`, `pointsDiscount` ni
`rewardOrigin` poslovne logike na terminu — poreklo živi u Voucher/Loyalty
audit sloju. Time se i invariant „jedna pogodnost" svodi na jedno polje.

### 14.3 Jedna pogodnost po terminu — tvrdo pravilo

```text
Appointment.appliedVoucherId = najviše jedan
```

Zabranjeno je svako slaganje: vaučer + vaučer, vaučer + points nagrada, dve
points nagrade. Zamena NIJE „dodaj drugu" — postojeća se prvo eksplicitno
ukloni. Uslov je deo samog upisa (`appliedVoucherId: { $in: [null, undefined] }`),
ne provera pre njega, pa ga ni trka ne može zaobići.

Ne postoji tenant podešavanje „dozvoli stackovanje" ni globalni „maksimalni
popust". Konfigurisana nagrada je već granica popusta.

### 14.4 Stabilan identitet ponude

`LoyaltyConfig.pointsShop[].id` je persisted identitet i jedini autoritet u
redemption toku. Indeks u nizu to nije: promena redosleda ili cene pomerila bi
značenje svakog zahteva u letu, pa bi klijentkinja platila jednu nagradu a
dobila drugu.

- id nastaje na serveru; id iz forme se prihvata samo ako već pripada tom
  salonu (`assignPointsShopIds`);
- izmena cene/nagrade i reorder **ne menjaju** id;
- browser šalje samo id — cena u poenima i vrednost nagrade se uvek ponovo
  čitaju iz trenutne tenant konfiguracije;
- ponuda bez id-a se **ne nudi** za kupovinu (fail-closed za zatečene zapise);
- `Voucher.pointsShopSnapshot` čuva uslove u trenutku kupovine (ponuda, cena,
  tip i vrednost nagrade, usluga, rok), pa kasnija izmena ponude ne menja već
  izdat vaučer.

### 14.5 Atomsko skidanje poena — najvažnija tehnička granica

Redemption je prvi **konkurentni negativni tok**: do njega su poene skidali
samo admin i no-show putanja. `postLedgerEntry` za negativne iznose radi
read→clamp, što je za takav tok bilo dovoljno, a za trošenje nije — dva
paralelna zahteva prošla bi istu proveru salda.

Zato points-shop kupovina ide kroz `runLoyaltyTransaction`, ovim redom:

```text
── u transakciji ─────────────────────────────────────────────────────────
1. PONOVO učitaj termin       u sesiji, u opsegu pozivaoca
2. još otvoren? bez pogodnosti?
3. PONOVO učitaj konfiguraciju i ponudu po stabilnom offerId
4. poeni uključeni? nagrada važi za TRENUTNU uslugu?
5. ledger unos                idempotency ograda PRE naplate
   (unique {tenantId, points-shop:{appointmentId}:{offerId}})
6. USLOVNO skidanje poena     findOneAndUpdate({ pointsBalance: { $gte: cost } })
7. Voucher + snapshot uslova
8. upis na termin             uslov: još otvoren I još bez pogodnosti
```

Tri garancije koje iz toga slede:

```text
pointsBalance nikad < 0
dva paralelna zahteva ne mogu potrošiti isti saldo
kupovina se izvršava nad STANJEM IZ TRANSAKCIJE, ne nad pročitanim ranije
```

**Zašto se sve mutable čita ponovo (koraci 1–4).** Uslovni debit rešava trku
oko salda, ali ne i oko poslovnog stanja. Vlasnica sme da promeni cenu ponude,
a termin da promeni uslugu, dok je zahtev u letu — bez ponovnog čitanja bi se
prodala stara ponuda po staroj ceni ili proverio scope nad starom uslugom. Pre
transakcije se namerno rešava samo ono što ne može da se promeni pod nogama:
plan/capability.

Ledger je namerno **pre naplate**: da je posle skidanja, retry bi prvo skinuo
poene pa tek onda otkrio da je duplikat. Bilo koji neuspeh ruši celu
transakciju — ne postoji stanje „poeni skinuti, vaučera nema" ni obrnuto.

Isto transakciono ponovno čitanje važi za primenu postojećeg vaučera i za
uklanjanje pogodnosti: paralelan završetak termina mora da SPREČI izmenu
pogodnosti, pa je status deo samog upisa, ne provera pre njega.

### 14.6 Idempotencija i povratak

Retry istog zahteva vraća **postojeće uspešno stanje**, ne grešku posle
naplate. Ako se points-shop vaučer kasnije skine sa termina:

```text
poeni se NE vraćaju · Voucher → active · klijentkinja ga i dalje poseduje
```

Vrednost nije izgubljena, samo je premeštena iz salda u vaučer. Isti zahtev ne
može drugi put „kupiti" istu nagradu za isti termin.

### 14.7 Audit

Kupovina proizvodi ledger unos `entryType: "redeem"`, `currency: "points"`,
`amount: -costPoints`, sa `source` koji nosi termin, vaučer i stabilan
`points_shop:{offerId}`; kod admin primene i `adminUserId`.

`Koriguj balans` (§10) ostaje **potpuno odvojen** alat: normalna kupovina
nagrade se nikad ne knjiži kao `manual_adjustment` i za nju se ne traži razlog.

### 14.8 Ko bira i kada

**Klijentkinja — posle zakazivanja, ne u widget-u.** Loyalty nije korak u
booking toku. Prvo termin mora u potpunosti da uspe; tek onda, i samo ako
server kaže da ima nešto upotrebljivo, otvara se zaseban ekran. Ako loyalty
zakaže, termin je i dalje zakazan i potvrda je normalna. „Ne sada" ne menja
ništa.

**Salon — „Primeni pogodnost".** Isti picker i isti server seam, iz liste
termina i iz Client 360 dosijea, za trenutak kada klijentkinja uživo kaže da
želi da iskoristi nagradu. Klik admina JESTE izvršenje: konfigurisana nagrada
je već salonova poslovna odluka, pa nema `requested → pending → approved`
lifecycle-a.

Oba UI-ja šalju samo id izbora; ne računaju popust, ne proveravaju saldo i ne
odlučuju eligibility.

### 14.9 Appointment Checkout

„Došla" više nije gola promena statusa nego račun:

```text
Cena / dogovorena cena       3.500 RSD
Pogodnost                     -500 RSD
Za naplatu                    3.000 RSD
Stvarno naplaćeno            [ 3.000 ]
Nakon završetka: očekivano +1 ❤️  +30 ⭐
```

Svaka brojka dolazi iz `previewAppointmentCheckout`. Modal ne radi
`3500 - 500` i ne računa poene — prikazan iznos koji se razlikuje od
proknjiženog gori je od nikakvog iznosa. Očekivana zarada poštuje dnevne
anti-abuse limite i prikazuje se kao **„očekivano"**, jer ledger ostaje
autoritet.

`completeAppointmentCheckout` je **jedini** canonical put do `completed`. Do
T1-4 su postojala dva (admin update ruta i auto-complete cron), svaki sa svojom
aritmetikom; sada dele isti seam. Cron prosleđuje `source: "auto"` i nijedan
iznos — mašina ne izmišlja cenu koju čovek nije rekao.

**Račun se zaključava nad pogodnošću nad kojom je izračunat.** Checkout čita
termin, izračuna račun, pa tek onda upisuje `completed`. Između ta dva koraka
neko drugi sme da primeni ili skine pogodnost, pa upis nosi compare-and-set na
`appliedVoucherId`: prolazi samo ako je pogodnost i dalje ona iz računa (ili je
i dalje nema). Neslaganje je `409` i termin ostaje nezavršen — pozivalac mora
da povuče svež pregled, jer se promenila osnovica po kojoj je vlasnica donela
odluku. Isti uslov štiti i granu u kojoj pogodnost otpada: plan napravljen za
vaučer V1 ne sme da oslobodi vaučer V2.

**Potvrđena cena je server invariant, ne UI pravilo.** Termin sa pogodnošću
koja ostaje ne sme da se završi dok pre-benefit cena nije potvrđena:

```text
on_request + vaučer bez dogovorene cene  → 400, termin netaknut
from + vaučer sa samo minimumTotal       → 400 (minimum nije dogovor)
fiksna poznata cena + vaučer             → prolazi, potvrda se ne traži
bez pogodnosti                           → nepoznata cena sme da ostane nepoznata
```

Disabled dugme u modalu je samo prikaz istog pravila; ruta se sme pozvati i
direktno, a auto-complete je i zove bez iznosa. Auto-complete takav termin
**preskače** — niti izmišlja cenu, niti skida pogodnost.

Redosled završetka:

```text
1. pogodnost je izabrana PRE completion-a
2. pre-benefit cena poznata ili potvrđena gde treba
3. server recompute popusta
4. salon potvrdi stvarno naplaćeno
5. status → completed  (atomic, uslov na prethodni status)
6. reserved Voucher → redeemed
7. durable appointment_completed događaj
8. srca/poeni na STVARNU potrošnju
9. milestone može proizvesti NOV vaučer
10. celebration pokazuje stvarno proknjižen rezultat
```

Redemption sam po sebi nikad ne glumi `appointment_completed`: kupovina i
zarada su dva različita događaja.

**Finalizacija je durabilna i popravljiva.** `loyaltyProcessed.completed` znači
„finalizacija je durabilno uspostavljena", a ne „počeli smo da pokušavamo":
zastavica se postavlja TEK posle vaučera i durabilnog događaja. Ranije je bila
prva, pa bi pad posle nje trajno ostavio rezervisan vaučer na završenom terminu
ili posetu bez `appointment_completed` događaja — dakle bez zarade — dok bi
svaki sledeći pokušaj video `completed` i odustao. Sweeper tu ne pomaže: on
retry-uje događaje koji POSTOJE.

Svi koraci finalizacije su idempotentni (CAS na vaučeru, unique `sourceId` na
događaju, idempotency ključ u ledgeru), pa ponovni checkout nad već završenim
terminom **popravlja** nedovršenu finalizaciju umesto da odustane. Dvostruka
zarada time nije moguća.

### 14.12 Ciklusi završetka i vraćanja

Termin sme da bude završen, vraćen i ponovo završen. Svaki prolaz je CIKLUS, a
`loyaltyProcessed.revertCount` je njegov redni broj; identiteti događaja se
izvode isključivo iz njega:

```text
ciklus N  →  completion `{id}:c{N}`  ↔  revert `{id}:r{N+1}`
```

**Revert se oslanja na dokaze, ne na zastavicu.** Otkad zastavica znači
„finalizacija je durabilno uspostavljena", postoji prozor u kome je završetak
već ostavio trag a zastavica još nije postavljena. Revert zato gleda tri
nezavisna dokaza: vaučer je bio iskorišćen za taj termin, durable
`appointment_completed` postoji za tekući ciklus, ili je zastavica postavljena.
Vaučer se pri tome ispravlja **uvek i bezuslovno** — `unRedeemForAppointment`
je CAS i nad nikad iskorišćenim vaučerom je no-op, a uslovljavanje zastavicom
je i bilo uzrok zaglavljenog `redeemed` vaučera na terminu koji više nije
završen.

**`revertCount` napreduje POSLEDNJI.** Iz njega nastaje identitet revert
događaja, pa bi uvećanje pre upisa značilo da posle neuspelog upisa sledeći
pokušaj računa drugi ciklus i ista kompenzacija više nikada ne može da nastane
pod istim imenom. Redosled je: vaučer → durable revert događaj → CAS na
`revertCount` i zastavicu.

**Zastareo završetak ne nagrađuje vraćen termin.** `LoyaltyEvent` je durabilan
red; `pending`/`failed` završetak sme da bude obrađen mnogo kasnije, kad je
termin već vraćen. Zato `handleCompleted` ponovo čita termin i knjiži samo ako
termin i dalje postoji, pripada istom tenantu i klijentu, stoji na `completed`
i nalazi se na **tom istom ciklusu**. U suprotnom se ne dodeljuju ni srca ni
poeni, ne pomeraju se brojači, ne izdaje se milestone vaučer i nema
celebration-a — a događaj se razrešava umesto da zauvek kruži kroz sweeper.

### 14.10 Gate

T1-4 ne uvodi nijedan nov plan feature. Važe postojeći uslovi iz §3
(capability `loyalty.rewards` + `LoyaltyConfig.enabled`), a points-shop
dodatno traži `currencies.points.enabled`. Superadmin override i dalje
nadjačava plan: Maria/Free sa uključenim loyalty-jem radi isto kao plaćen
tenant.

### 14.11 Greške

Odbijanje nije 500. `400` nevalidan izbor (nagrada ne postoji, ne važi za
uslugu, termin nije eligible) · `403` tuđi termin, pogrešan tenant, capability
· `404` nepostojeći ili tuđi resurs (postojanje tuđeg zapisa se ne odaje)
· `409` pogodnost već postoji, nedovoljno poena, vaučer upravo rezervisan
drugde.

Kontrolni tracker: [TODO.md](TODO.md).

## 15. T1-5 — DEFERRED

Salonski paketi/pretplate klijentkinje (`ClientPackage`, entitlement, payment
provider) nisu deo Loyalty domena i ostaju odloženi. `Service.subscription` samo
opisuje šta salon nudi i nije dokaz da je klijentkinja nešto kupila.

Završetak T1-4 **ne** promoviše T1-5. Points-shop nagrada je vaučer, ne kupljen
paket: nema entitlement-a, nema iskorišćenih termina i nema plaćanja. Sledeći
product rez bira vlasnik proizvoda.

## 16. Naziv „Growth Studio"

`AdminGrowthStudio.tsx` je **danas Loyalty UI** i to ostaje tako. Podela u
[PANTA-GROWTH-STUDIO.md](PANTA-GROWTH-STUDIO.md) (Nagrađivanje vs Growth Studio
za distribuciju) je **FUTURE IA odluka**; preimenovanje koda nije zakazano i nije
preduslov ni za jedan otvoreni rez.
