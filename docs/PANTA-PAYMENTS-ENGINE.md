# Payments Engine — ugovor (SPECIFIKACIJA, nije implementirano)

> Status: **ništa od naplate klijentkinje ne postoji u kodu.** Ovo je ugovor
> koji se zaključava pre prve linije, da bi se izbeglo da novac uđe u domen kroz
> mala vrata. Jedino što je implementirano je Faza 0 (trajnost webhook prijema).
>
> Postojeće: [cene](PANTA-BOOKING-PRICING.md) ·
> [loyalty](PANTA-LOYALTY-ENGINE.md) · [otkazivanje](PANTA-CANCELLATION-NOSHOW-POLICY.md) ·
> redosled rada: [TODO.md](TODO.md)

## 1. Jedna rečenica

Danas platforma naplaćuje **samo pretplatu salona** (Paddle). Novac između
salona i klijentkinje ne postoji: aplikacija naplatu samo **zapisuje** —
vlasnica ukuca „stvarno naplaćeno" u Checkout.

## 2. Zatečeno stanje

| Radi | Ne postoji |
|---|---|
| Paddle Billing, salon → platforma | depozit / avans / kapara — **nula pojavljivanja u repou** |
| `Subscription` (1 po tenantu), `Plan` | refund kao funkcija |
| plan gating (`resolveEffectivePlan`) | ijedan ekran koji uzima karticu od klijentkinje |
| `WebhookEvent` trajnost prijema (Faza 0) | `Payment` / `PaymentLedger` / `ClientPackage` |

**Gate-ovi već postoje — ne treba nijedan nov plan feature:**

```text
PlanFeatures.paymentIntegration    kiki + enterprise   (bez runtime potrošača)
PlanFeatures.clientSubscriptions   kiki + enterprise   (bez runtime potrošača)
```

**`Service.subscription` je mrtvo slovo.** `{ enabled, subscriptionType,
treatmentCount, priceMonthly }` se renderuje kao tekstualni badge na temama, ali
nema kupovine, brojača tretmana ni veze sa `Appointment`-om. Ruta za izmenu čak
računa `discount`/`finalPrice` koje Mongoose tiho odbacuje (nisu u šemi).
Opisuje **ponudu**, ne kupovinu.

## 3. Ko naplaćuje — odluka i njena cena

**Odluka vlasnika proizvoda: Marysoll je merchant of record** — naplaćuje u
svoje ime pa isplaćuje salonima.

To je mnogo veća obaveza od izbora biblioteke. MoR znači da Marysoll drži novac
koji nije njegov, duguje svakom salonu saldo, mora da usaglašava isplate,
apsorbuje chargeback-ove i **izdaje račun u svoje ime**. U Srbiji obaveza
fiskalizacije stoji na pružaocu usluge, pa je račun koji Marysoll izdaje za
manikir koji radi salon otvoreno pravno pitanje.

Iz toga slede dve konkretne posledice za model: nedostaje pojam **`Payout`**, i
ledger mora da nosi **`account`** — inače se ne može odgovoriti „šta dugujemo
svakom salonu na kraju meseca", što je cela operativna posledica ove odluke.

### Paddle nije provajder za ovo

Paddle je MoR za **softver i digitalne proizvode**. Usluge uživo su van njegovih
pravila prihvatanja. Vezivanje salonskih depozita na postojeći Paddle nalog
rizikuje reviziju ili gašenje naloga — **uključujući pretplatu salona koja već
radi**. Isto važi za Lemon Squeezy (od 2024. u vlasništvu Stripe-a).

Podela „Paddle za mesečno, Lemon za dnevno" ne stoji: oba rade i pretplate i
pojedinačne transakcije, a `POST /transactions` se u ovom kodu **već koristi**.

Zato je seam **provider-agnostičan**, a izbor provajdera je otvoren i zavisi od
odgovora koje ne daje kod:

| Pitanje | Ko odgovara |
|---|---|
| Sme li Marysoll naplaćivati uslugu koju pruža salon? | pravila provajdera + pravnik |
| Prihod kroz knjige Marysoll-a, isplate salonima kao trošak | knjigovođa |
| **Fiskalizacija avansne uplate** | knjigovođa — **tvrd preduslov** |
| RSD i domaće kartice | provajder |

**Alternativa vredna još jednog razgovora pre Faze 2:** facilitator model —
salon je MoR, Marysoll ne dodiruje novac, provajder deli na naplati. Manje
kontrole nad UX-om, ali briše oko 80% obaveza iz ovog dokumenta, uključujući
`account`, isplate i chargeback clawback.

## 4. Granica engine-a

Isti obrazac kao Loyalty:

```text
packages/payments-engine/     čist domen: kompozicija iznosa, pravila depozita,
                              entitlement matematika. Bez DB/Next/React.
src/lib/payments/             application sloj: adapteri provajdera, prijem
                              webhook-a, ledger
src/lib/platform/payments-client.ts   jedina tačka uvoza čistog domena
```

Payments Engine se dodaje u katalog u
[ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md).

## 5. Model

### 5.1 Jedinice novca

Appointment domen radi u **celim RSD** (`Math.round` svuda). Platni domen nosi
**minor units** (`amountMinor`), jer se provizije i delimični povraćaji tu
zaokružuju i drift postaje proveriv nesklad. Konverzija se dešava na tačno
jednoj granici i zaokružuje jednom. `pricing.*` ostaje ceo RSD, netaknut.

Valuta se **proverava**, ne pretpostavlja: `pricing.currency` ima default
`"RSD"` i ništa ga ne validira. Kreiranje namere mora tvrdo odbiti neslaganje.

### 5.2 `PaymentIntent` — jedna namera naplate

**Ne** jedna po terminu. Depozit i ostatak su dve namere.

| polje | svrha |
|---|---|
| `tenantId` | tenant-scoped iako je Marysoll MoR — izveštavanje i dijagnostika to podrazumevaju |
| `purpose` | `appointment_deposit \| appointment_balance \| appointment_full \| package_purchase \| package_renewal`. **Ne boolean `isDeposit`** — svrha određuje politiku povraćaja i sme li ikad da piše `chargedAmount` |
| `subject: { type, id }` | polimorfno, isti oblik kao `BookingReservation.domainRef` |
| `clientTenantUserId` | ko plaća; nullable — vidi §9 (gosti) |
| `amountMinor`, `currency` | traženi iznos, **zamrznut pri kreiranju** |
| `basis` | vezivanje za pogodnost — §7 |
| `policySnapshot` | uslovi depozita/povraćaja na snazi pri kreiranju. Isti razlog kao `Voucher.pointsShopSnapshot`: salon sme sutra da promeni politiku, izdata namera ne sme da se pomeri |
| `status` | `requires_payment \| processing \| settled \| failed \| expired \| cancelled \| refunded \| partially_refunded`, samo CAS prelazi |
| `expiresAt` | zahtev za depozit mora da umre |
| `provider` | `"manual" \| ...` — `"manual"` je salon koji beleži keš/uplatu na račun. **Jedan ledger za sav novac, uključujući offline** |
| `clientCommand` | `{ idempotencyKey, fingerprint }` — isti obrazac kao `BookingOperationReceipt`, da dupli klik ne iskuje dve namere |

**Namerno NEMA polje `amountPaid`.** Izvodi se iz ledgera. `LoyaltyAccount`
kešira balans i zbog toga mu je potrebna `loyalty.balance.mismatch` provera —
to se ne ponavlja tamo gde drift nije kozmetika.

Indeksi prate zatečene ožiljke: `{"providerRef.transactionId"}` unique
**partial** na `{$type: "string"}`, jer `sparse` ne preskače eksplicitan `null`
(komentar u `Subscription.ts` je upravo ta pouka).

### 5.3 `PaymentLedger` — append-only, sa predznakom

Doslovno obrazac `LoyaltyLedger`-a, jedinog dokazanog idempotency mehanizma u
repou: unique `{tenantId, idempotencyKey}`.

| polje | svrha |
|---|---|
| `entryType` | `authorize \| capture \| refund \| chargeback \| fee \| payout \| forfeit \| adjust` |
| `amountMinor` | **sa predznakom**, kao `LoyaltyLedger.amount` |
| `account` | `client_funds \| salon_payable \| platform_revenue \| provider_fee` — bez ovoga nema odgovora „šta dugujemo salonu" |
| `source` | `{ webhookEventId, providerEventId, adminUserId, reason }`; `reason` obavezan na `adjust` |
| `idempotencyKey` | **izveden iz događaja**, nikad slučajan: `${provider}:${providerEventId}:${entryType}:${n}` — ponovljen webhook daje isti ključ i E11000-preskače |

**Nigde keširan balans.** Svaki saldo je `$sum` po indeksiranom polju.

Ne ide se dalje u pravo dvojno knjigovodstvo. Predznak + `account` + provera
`Σ client_funds == Σ salon_payable + Σ platform_revenue + Σ provider_fee` daje
95% vrednosti za 20% cene — a ako se odluka o MoR-u promeni, `account` se briše
bez gubitka.

### 5.4 `ClientPackage` (= T1-5) — i zašto **kuje vaučere**

Polja su već specifikovana u [PANTA-CLIENT-360.md §K](PANTA-CLIENT-360.md).
`remaining` se **izvodi, nikad ne persistira**.

Paket je monetarna pogodnost, a T1-4 je zaključao da je `Voucher` **jedina**
monetarna pogodnost koju `Appointment` poznaje i da je najviše jedna po terminu.
Zato:

> **Kupovina paketa kuje N vaučera** (`Voucher.origin: "package"`, uz `packageId`
> povratnu referencu), umesto da uvede `appliedPackageId` na termin.

| | kovanje vaučera | `appliedPackageId` |
|---|---|---|
| nova polja na `Appointment` | **nula** | jedno |
| izmene u `benefitCasFilter`, `planBenefitRecompute`, `BENEFIT_CLEAR_UNSET`, checkout DTO, statistici | **nijedna** | sve navedeno |
| „jedna pogodnost po terminu" | tačno **po konstrukciji** | novo pravilo koje treba braniti |
| preostali tretmani | `countDocuments({ packageId, status: "active" })` — ne može da odluta | brojač koji može |
| stackovanje | pitanje se ne otvara | odmah se otvara |

Lifecycle `active → reserved → redeemed → active` već modeluje „rezervisan pri
zakazivanju, potrošen na završetku, vraćen pri otkazivanju" — što jeste
semantika tretmana iz paketa.

Granice koje treba znati: *mesečno neograničen* paket ne može da iskuje konačan
skup unapred — kuje jedan vaučer po zakazivanju, uz proveru perioda. Paket sa
*procentualnim popustom* je generator vaučera, ne brojač tretmana. U oba slučaja
`ClientPackage` nosi **pravilo**, vaučeri su **instance**.

**Odluka koju to povlači:** termin pokriven paketom dobija `chargedAmount = 0` —
*stvarnu* nulu, koju pravilo `0 ≠ null` već razlikuje — i time zarađuje 0 poena.
Verovatno tačno (novac je zarađen pri kupovini), ali mora biti izričito.

### 5.5 Nova polja na `Appointment`: nijedno nije neophodno

| kandidat | presuda |
|---|---|
| `appliedPackageId` | **izbegnuto** — §5.4 |
| `paidOnlineAmount` / `depositAmount` | **izbegnuto** — izvodi se iz ledgera |
| `depositPolicySnapshot` | **izbegnuto** — pripada `PaymentIntent.policySnapshot` |
| `payment: { state, lastIntentId }` | **jedino branjivo**, kao keš za listu termina bez N+1. Piše ga samo payments seam, nikad nije autoritet, i stiže uz svoju integrity proveru |

Razlog nije čistota. `Appointment` već nosi dva paralelna aritmetička sistema
(`pricing.*` i vaučersku aritmetiku) i checkout počinje komentarom koji
razdvaja četiri činjenice koje se ne smeju pomešati. Treći novčani sistem na tom
dokumentu je ono što ga čini nečitljivim.

## 6. Ključni invariant — dva registra, nijedan se ne izvodi iz drugog

> **Online plaćanje menja NAČIN i TRENUTAK naplate, ne IZNOS.**
>
> `pricing.chargedAmount` odgovara: *koliko je ovaj termin vredeo?*
> `PaymentLedger` odgovara: *kako je novac stigao i gde je sada?*

Iz toga sledi tvrda provera:

> **`chargedAmount` ≥ neto naplaćeno online, uvek.**

Kršenje je integritetska **greška**, ne validacija forme — hvata slučaj kada
vlasnica ukuca 2.000 a klijentkinja je platila 3.000, povraćaj koji nije upisan,
i depozit koji niko nije uračunao.

`chargedAmountDefault` u checkout-u **se ne menja** — ostaje `amountDue`. Modal
dodaje dva izvedena reda („plaćeno online" / „za naplatu na licu mesta"). Prikaz,
ne semantika. **Plaćanje nikad ne piše `pricing.*`** — to rade samo
`applyQuotedTotal` i `applyChargedAmount`, i samo iz checkout seam-a.

### Dva izuzetka — oba su čitanje računa, ne izmišljanje cene

1. **Zadržan depozit** pri kasnom otkazivanju/nedolasku.
   `getAppointmentRealizedValue` je već napisan tačno za ovo, pre nego što su
   depoziti postojali: *„ako je salon naplatio nadoknadu za kasno otkazivanje,
   to JESTE prihod"*. Upis ide sa `chargedBy: "system:deposit_forfeit"`.
2. **Auto-complete nad unapred plaćenim terminom.** Cron principijelno ne šalje
   iznos. Bez izuzetka bi potpuno plaćen termin završio sa `chargedAmount: null`,
   upao u „termini bez cene" i doneo nula poena iako je novac stigao. Izuzetak
   važi **samo** kada se `basis` naplate i dalje poklapa sa terminom.

**Ne dirati `getAppointmentRealizedValue`.** Dodavanje oduzimanja povraćaja tiho
prepisuje svaki istorijski broj u Client 360 i statistici, a postoje testovi koji
drže sadašnje ponašanje. Povraćaji dobijaju zaseban
`getAppointmentNetRealizedValue`, a svaki potrošač bira eksplicitno.

## 7. Zaključavanje pogodnosti naplatom

T1-4 dozvoljava izmenu vaučera sve do završetka, uz `benefitCasFilter` CAS. Čim
je novac naplaćen nad izračunatim iznosom, pogodnost prestaje da bude preferenca
i postaje **dokaz**.

**Namera pamti osnovicu, termin ostaje slobodan:**

```text
PaymentIntent.basis = {
  preBenefitAmountMinor, benefitVoucherId, benefitDiscountMinor,
  amountDueMinor, quotedAt, servicesFingerprint
}
```

**Brava je CAS unutar postojeće loyalty transakcije, ne boolean.**
`assertOpenForBenefit` dobija drugi uslov: `removeBenefit` i
`applyExistingVoucher` već rade u `runLoyaltyTransaction` sa ponovnim čitanjem u
sesiji — dodaje se provera žive/naplaćene namere i odbijanje postojećim tipom
greške.

> **Bravu otključava novac, ne dugme.** Pogrešno primenjen vaučer se ispravlja
> jedino redosledom: povraćaj → pa uklanjanje. Jedno pravilo, bez override flaga.

**Webhook nikad ne odbija novac.** Ako pri naplati CAS nad terminom ne prođe,
uplata se **svejedno upisuje**, a podiže se nalaz `payment.appointment.basisDrift`
uz obaveštenje adminu. Odbijanje da se zabeleži novac koji je već stigao je način
da se on izgubi.

### Tri scenarija

- **pogodnost uklonjena posle naplate** → odbijeno bravom; ako se provuče, CAS na
  završetku vraća 409
- **usluga promenjena posle naplate** → `servicesFingerprint` ne odgovara.
  Dozvoljeno, ali tera obračun razlike koja **sme biti negativna** — a negativna
  razlika je otkriveni dug prema klijentkinji. **§8 mora biti odlučen pre nego
  što ovo izađe.**
- **otkazano posle plaćenog depozita** → §8

## 8. Depozit i povraćaj

**Odluka: depozit se zadržava pri kasnom otkazivanju i nedolasku.**

Ponovo se koristi `clientAppointmentPhase()` iz
[cancellation.ts](../src/lib/appointments/cancellation.ts) — **ne uvodi se drugi
model vremena**:

| faza | ishod depozita | ledger | `chargedAmount` |
|---|---|---|---|
| `open` (u roku ili grace) | vraća se | `refund` | netaknut |
| `late` (→ `no_show`) | zadržan | `forfeit` | sistemski upis (§6) |
| `started` / admin no-show | zadržan | `forfeit` | sistemski upis |
| `unknown` | **bez automatskog kretanja novca** — admin odlučuje | — | netaknut |

Grace period od 30 minuta time besplatno štiti pogrešan klik od gubitka depozita.

### Odluke koje NISU donete

**Novac:** visina depozita (fiksno vs procenat) i gde stoji — **ne na `Service`**,
`Service.subscription` je opomena · **ko snosi proviziju provajdera pri
povraćaju** (mora se odlučiti pre prvog povraćaja, jer ledger traži gde da je
upiše) · ko sme da inicira povraćaj i uz koji razlog · rok · da li zadržan
depozit ide ceo salonu · delimični povraćaji u v1 · **chargeback posle isplate
salonu** (clawback iz sledeće isplate — stvarna MoR obaveza) · zaokruživanje.

**Domen:** da li zadržan depozit oslobađa vaučer (verovatno da — pogodnost nije
potrošena) · **da li zadržan depozit nosi poene** (`chargedAmount` vodi zaradu, a
forfeit ga piše; danas je bezbedno jer zarada ide iz `appointment_completed`, ali
mora se proveriti) · **kako povraćaji ulaze u statistiku** (menja istorijske
brojeve) · ko izdaje račun · vidi li salon način plaćanja.

**Povraćaj posle isplaćenog loyalty-ja.** Klijentkinja plati → termin se završi →
poeni proknjiženi → *pa onda* povraćaj. Poeni su možda već kupili vaučer koji je
rezervisan na drugom terminu, a balansi staju na nuli. Za v1 verovatno **potrošen
marketinški trošak** — ali mora biti zapisano, jer će prvi put biti prijavljeno
kao bug.

## 9. Otvorena pitanja pre Faze 2

**Gosti nemaju identitet.** `POST /api/public/[tenantSlug]/appointments/guest`
pravi termin bez ulogovanog klijenta. Depozit koji plati gost nema nalog na koji
bi se vratio, nema panel u kom bi se video, nema `LoyaltyAccount`. Ili depozit
traži nalog, ili je `clientTenantUserId` nullable uz claim preko mejla.

Uz to: `B-SEC` beleži da javni feed namerno nosi četiri polja i **nikad cenu** —
javni link za plaćanje je ne sme odati.

**Šta neplaćen depozit radi sa slotom.** Tri opcije, jedna je privlačna i
pogrešna:

- **(a) `pending` termin drži slot, ističe ako se ne plati** — traži sweeper.
  **Za Fazu 2 birati ovo.**
- **(b) termin nastaje tek na uplati, iz webhook-a** — deluje čisto, ali znači da
  webhook dodeljuje slot i **može da padne na zauzetom terminu POSLE plaćanja.**
  Najgori mogući ishod; krši „webhook nikad ne odbija novac".
- **(c) `BookingReservation` hold** — dark core već ima oblik. Ovo može biti
  argument koji konačno opravdava T3 cutover.

## 10. Gate-ovi

Bez novih plan feature-a. Nove capability stavke mapiraju se na **postojeće**
flagove, sa `platformAvailable: false` dok provajder ne postoji — isto stanje
kao `distribution.campaigns` danas:

```text
"payments.client"  → plan-feature "paymentIntegration"
"packages.client"  → plan-feature "clientSubscriptions"
```

## 11. Faze

| Faza | Sadržaj | Status |
|---|---|---|
| **P0** | Trajnost webhook prijema: `WebhookEvent`, dedup, svežina potpisa, zaštita od prestizanja | ✅ **u kodu** |
| **P1** | `PaymentLedger` + `PaymentIntent` dark core, **`provider: "manual"`** — bez kartice i bez regulatorne izloženosti | ⬜ |
| **P2** | Stvaran provajder, **samo depoziti**, jedan tenant, iza kill switch-a | ⬜ |
| **P3** | Ostatak / puna pretplata na checkout-u | ⬜ |
| **P4** | `ClientPackage` → kovanje vaučera | ⬜ |

**Faza 1 je ta koja nalazi *proizvodne* greške**, i može biti ceo proizvod neko
vreme: salonu „ko mi šta duguje" vredi više nego „primi karticu online".

**Mesečne pretplate klijenata NISU faza 5 nego zaseban proizvod.** Recurring
naplata je drugi problem — mandati, dunning, istek kartice, rasporedi ponavljanja
— i deli sa depozitom samo reč „plaćanje". Flag `clientSubscriptions` koji već
stoji u `planFeatures.ts` čini da deluje blisko, a nije.

Svaka faza nosi svoj integrity check (pravilo 5.3). **Novčane dijagnostike moraju
biti zakazane, ne on-demand** — integrity runner se danas pokreće samo kad
superadmin klikne dugme, a usaglašavanje koje se pokreće kad se neko seti nije
usaglašavanje.

## 12. Zabeleženo, ne popravlja se ovde

- **`Appointment.appliedPromotionId` je mrtvo polje** — referiše `Promotion`
  model koji **ne postoji**, a obe rute ga brišu iz ulaza. Stoji tri reda iznad
  loyalty bloka koji bi payments proširio.
- `GET /api/plans` je bez zaštite i vraća Paddle price ID-jeve
  (`requireSuperAdmin` stoji samo na `POST`).
- `IServiceSubscription` u tipovima nosi polja bez pandana u šemi.
- Nijedan cron ne dodiruje pretplate — istek je lenj, pa `isTrialActive` ostaje
  `true` zauvek posle isteka probnog perioda.
- `cancelSubscriptionFromPaddle` ne radi upsert: otkazivanje bez postojećeg
  `Subscription` zapisa tiho ne radi ništa (polja na `Tenant`-u se ipak upišu).
