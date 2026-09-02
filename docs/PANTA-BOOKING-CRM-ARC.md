# Beauty Booking / CRM — operativna arhitektura luka

> **CURRENT implementation reference:** `staging/production-engines`
> ([pravilo](PANTA-BRANCHING-STRATEGY.md#canonical-implementation-grana)) · provereno nad kodom **2026-09-03**.
> Staging tenant za vizuelnu proveru: **theme-1 / Marysoll Makeup & Nails**.
>
> Ovo je operativni ugovor jednog luka: otkazivanje, cene, zahtev za uslugu,
> centralizacija booking write puta i Client 360 read model. Politike žive u
> zasebnim dokumentima:
> [otkazivanje](PANTA-CANCELLATION-NOSHOW-POLICY.md) ·
> [cene](PANTA-BOOKING-PRICING.md) · [zahtev za uslugu](PANTA-SERVICE-INTAKE.md) ·
> [Client 360](PANTA-CLIENT-360.md) · [Loyalty](PANTA-LOYALTY-ENGINE.md).
>
> Redosled rada i status po rezovima drži isključivo [TODO.md](TODO.md).
>
> **Verifikacija je do sada isključivo mašinska** — typecheck, lint, testovi i
> produkcijski build. Browser acceptance nad Marysoll tenantom tek predstoji.

## 1. Zašto luk postoji

Popravljali smo pojedinačne simptome — group cena drugačija na cenovniku nego u
widgetu, `on_request` postaje 0, trajanje iz jednog pa iz drugog izvora — dok
audit nije pokazao uzrok: **Booking Engine je postojao, ali su ga produkcijski
tokovi zaobilazili.** Svaka površina je imala svoju poslovnu logiku.

Cilj nije jedan izgled za svaku ulogu. Klijentske presentation površine dele
jedan widget, dok admin operativni UI sme izgledati drugačije — ali svi pitaju
**isti server**.

## 2. Dva seam-a koja se ne smeju pomešati

Luk ima dva odvojena puta i to je najvažnija stvar u ovom dokumentu.

### 2.1 Command path — ko sme da upiše činjenicu

```text
booking komanda (tenant + serviceId + izbor + datum/vreme)
        ↓  lib/booking/resolveBookingRequest.ts     tenant-scoped Service iz baze
           resolveServiceBookingProduct → selekcija i trajanje
           estimateServicePrice        → cena
        ↓  checkSlotAvailability(canonical trajanje)
        ↓  lib/appointments/canonicalSelection.ts
   Appointment.services[0] + Appointment.pricing snapshot
```

`ref` iz zahteva **nije autoritet**: usluga se učitava po (tenant, serviceId), pa
se tek onda proverava da svaki `ref` pripada baš toj usluzi. Zahtev sa
`{ price: 1, duration: 5 }` dobija katalogške vrednosti.

### 2.2 Presentation path — šta UI sme da vidi

```text
persistence (Service dokument)
        ↓  lib/booking/servicePresentation.ts     jedan serializer javnog ugovora
   resolved service DTO (ref, priceMode, intakeEnabled, trajanje)
        ↓  lib/booking/widgetPresentation.ts      projekcija za widget
   BookingProvider → BookingModal                 sajt · /termini · panel · izmena
```

**Presentation nikada ne postaje business authority.** DTO postoji da četiri
klijentske površine ne bi imale četiri različita izračuna; cena, trajanje i
dostupnost i dalje dolaze iz command path-a. Svaka logika koja odlučuje *šta se
upisuje* pripada §2.1, i kad izgleda kao „samo prikaz".

Isti mapper projektuje persistence `service.bookingIntake.enabled` u presentation
`intakeEnabled` — vidi [intake](PANTA-SERVICE-INTAKE.md).

## 3. Write putanje — stvarni status

| Putanja | Ruta | Canonical resolver | Availability | Pricing snapshot |
|---|---|---|---|---|
| Klijent zakazuje | `POST /api/appointments/create` | ✅ | ✅ duration overlap + radno vreme | ✅ |
| Javni gost | `POST /api/public/[tenantSlug]/appointments/guest` | ✅ | ✅ | ✅ |
| Admin zakazuje | `POST /api/appointments/create-guest` | ✅ | 🟡 namerno samo isti `date+time` → 409 | ✅ |
| Klijent menja termin | `PUT /api/appointments/client/[id]/update` | ✅ | ✅ duration overlap | ✅ |
| Admin menja termin | `PUT /api/appointments/update/[id]` | ✅ | 🟡 namerno samo isti `date+time` → 409 | ✅ |
| Predlog termina | ista ruta, admin → klijent | ✅ | ✅ u trenutku **prihvatanja** | ✅ |
| **Legacy HMAC gost** | `POST /api/booking` | ❌ | ❌ samo `date+time` | ❌ |
| **Marketplace** | `POST /api/marketplace/appointments` | ❌ | 🟡 legacy provera | ❌ |

Poslednja dva reda su jedini preostali write ulazi koji zaobilaze canonical
seam: uzimaju `duration` iz zahteva i cenu iz `basePrice ?? 0`, pa na njima
`on_request + dodatak` i dalje može izgledati kao poznata cena, a svi njihovi
termini padaju u „Termini bez cene". **Migracija je odložena** i vodi se u
[TODO.md](TODO.md) pod DEFERRED — ali odvojeno od admin putanja, jer je stepen
migracije različit i ne smeju se voditi kao jedna stavka.

**Admin sloboda je odluka, ne propust** (2026-07-04): admin sme svesno da preklopi
termine i izađe iz radnog vremena. Zato admin putanje imaju samo zaštitu od
tačnog duplikata (isti datum i vreme drugog aktivnog termina → 409), a ne punu
proveru preklapanja.

## 4. Invarianti sa regresionim pokrićem

Ovo nisu istorijske anegdote nego pravila koja su nas već koštala i danas ih
čuvaju testovi:

- **`Appointment.services[]` mora nositi `variants` i `extras`.** Mongoose ih je
  u strict režimu tiho odbacivao dok ih schema nije dobila; `pricing.lines` čuva
  IZNOSE, pa iz „Stiker 3D · 700" nije moglo da se rekonstruiše šta je
  klijentkinja izabrala i svaka izmena datuma je nečujno brisala dodatke.
- **`appointment.pricing` bez `.lean()` je podokument.** `{ ...pricing }` ne
  kopira polja, pa `quotedTotal` postaje `NaN` bez ijedne greške. Snapshot se
  menja kroz namenske funkcije, nikad spread-om.
- **Cena prati izbor, ne sat.** `selectionSignature` gleda ime i količinu, ne
  iznos: pomeranje termina čuva potvrđenu cenu, promena usluge je poništava,
  poskupljenje u cenovniku nije nov izbor.
- **Server ne veruje statusu iz zahteva.** Klijent ne sme da pošalje
  `status: "appointment_approved"` niti da sam sebi odobri termin.
- **Neuspela izmena nije otkazivanje.** Raniji kod je upisivao
  `cancellationStatus = "late_cancel"` zbog NEUSPELOG pokušaja izmene i time
  obeležavao termin na koji klijentkinja dolazi.
- **Predlog ne rezerviše slot.** Predloženo vreme ostaje slobodno svima dok ga
  klijentkinja ne prihvati — inače bi salon slanjem predloga sam sebi blokirao
  termin. Zato je provera dostupnosti u trenutku prihvatanja, uz izuzimanje
  sopstvenog termina. Odbijen predlog nije otkazan termin.
- **`{ proposedDate: undefined }` ne briše polje.** Mongoose izbacuje `undefined`
  iz update-a, pa je predlog preživljavao odluku zauvek.
- **Potvrda ne sme da visi na `onClose`.** `AlertModal` je imao
  `onClose={onConfirm}`, pa su Escape i klik na pozadinu **otkazivali termin**.

## 5. Izolacija klijenta — bezbednosni invariant

`/api/appointments` je primenjivao `clientProfileId` **samo ako ga pozivalac
pošalje**, a agregacija nema `$project` — klijent koji izostavi parametar dobijao
je pune termine celog salona: ime, email, telefon, Instagram, napomenu, poruke,
intake fotografije, cene.

`requireCapability` tu ne pomaže: on proverava šta TENANT sme, ne šta korisnik
sme nad tuđim zapisom.

Danas server izvodi filter iz tokena. Klijentski UI zauzeće vuče iz sanitizovanog
javnog feeda, a `AppointmentCalendar` spaja svoje termine sa anonimnim tuđim —
inače bi zauzeti slotovi izgledali slobodno. Javni feed nosi četiri polja i
nikada cenu.

## 6. Statistika — tri različite činjenice

`s.price * quantity || 0` je svaki termin na upit pretvarao u prihod od nula.

```text
potential   fixed → tačan · from → minimum · on_request → quote ili null
quoted      quotedTotal kad postoji
realized    chargedAmount; katalogška cena samo uz completed
```

Računicu drži `lib/statistics/engine.ts` — **isti** domen sloj koji koristi
Client 360 (§7). Prikaz razdvaja potencijalni, završeni i otkazani prihod, a
„Termini bez cene" se broje odvojeno i ne ulaze ni u jedan zbir; bez toga bi
salon video manje termina nego što ih ima. Usluga bez ijedne poznate cene
prikazuje „Cena nije definisana" i „Udeo nepoznat", ne 0 RSD. Pita grafikon crta
udeo po broju termina, pa nepoznata cena ne menja krišku.

Statistics = današnje poslovne KPI/prihod/klijent činjenice. To **nije** budući
Analytics Engine (funnel, SEO, conversion, performance) — vidi
[ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md).

## 7. Client 360

Dosije klijentkinje je tenant-scoped read model nad istim domenima; ugovor je u
[PANTA-CLIENT-360.md](PANTA-CLIENT-360.md). Ovde je važno samo pravilo granice:
Client 360 ne uvodi nove činjenice i ne računa ništa u browseru.

## 8. Hero CTA

`BookingLauncher` portalira kalendar u modal (z-40); klik na slot otvara
`BookingModal` (z-50) — isti raspored koji theme-8 ima kroz
`Theme8ModalProvider`. Kalendar se sam registruje, pa launcher ne mora znati koji
je. Bez registrovanog widgeta CTA ostaje običan link na `/termini`.

> Ne mešati sa planiranim `BookingLauncher.open()` sa `offering` argumentom iz
> [PANTA-THEME9-FINAL-CTA.md §4.4](PANTA-THEME9-FINAL-CTA.md) — to je theme-9 API
> koji još ne postoji. Da li se dva imena spajaju kad theme-9 booking krene,
> ostaje otvoreno.

## 9. Zaključane product odluke

- **Marysoll bira dobar default.** Dodatno podešavanje se uvodi tek kada stvarna
  upotreba pokaže da saloni imaju različite potrebe. Događaji se beleže dovoljno
  precizno da se pravilo kasnije promeni **bez gubitka istorije**. Pre svake nove
  opcije u adminu pita se: *mora li vlasnica salona zaista da donese ovu odluku?*
- **Grace period je sistemskih 30 minuta**, ne tenant podešavanje — vlasnica ne
  bi znala zašto slider postoji.
- **Intake je suprotan slučaj i zato ima checkbox:** samo salon zna da li usluga
  traži referencu.
- **`late_cancel` i stvarni nedolazak imaju istu posledicu**, uz razlog sačuvan
  odvojeno (`noShowReason`). Bez težina, bodova i podešavanja dok saloni ne
  pokažu potrebu.
- **Vaučer na `on_request` terminu ostaje rezervisan** i čeka quote.
- **Admin predlog termina ima eksplicitno Prihvati / Odbij**, sa proverom
  dostupnosti u trenutku prihvatanja.
- **Blog ostaje u navigaciji** — salon bez sadržaja dobija empty state; sama
  navigaciona stavka nije problem.
- **AI generisanje slika se ne nudi javno.** Endpoint je admin + plan gated;
  uključuje se kroz plan ako salon zatraži, bez izmene koda —
  [odluka](PANTA-AI-IMAGE-GENERATION.md).
- **Theme-1 je privatna za Marysoll**, kroz postojeći `THEME_ACCESS` seam (isti
  mehanizam kao theme-8 i theme-9), bez ijednog `if (tenantSlug === …)` u
  komponentama teme.

## 10. Odloženo — ima odluku, nema termin

- **Intake v1.1** — izbor polja po usluzi; wizard se **ne pravi** (konačni v1 UX
  je jedan checkbox). Intake na admin create ulazu još ne postoji.
- **Reschedule mejl** sa starim i novim terminom — notifikacija radi, nedostaje
  stari snapshot u telu; bez novih `previousDate/Time` polja.
- **Restriction Engine** — `noShows`, `late_cancel` i loyalty događaji ostavljaju
  činjenice; **nema automatskog blacklist-a**.
- **Brisanje theme-3/4/6** — ~7.300 linija, 66 fajlova; baza potvrđena prazna.
  Preduslov: `Theme3GalleryMasonry` mora u `shared/` jer ga theme-1 i theme-2
  uvoze.
- **`cleanup:stale-group-items`** — 2 usluge (marysoll, anja) nose mrtav
  `services[]` niz iz vremena kad su bile paketi. Skripta je idempotentna i
  **nije pokrenuta**; pokretanje je svesno odloženo, nije zaseban rez.
- **`chargedAmount` na otkazanom terminu, naknada za otkazivanje, refund** —
  rešava se kada postoji stvarni payment/refund lifecycle. Bez engine-a nema
  smisla projektovati hipotetičku finansijsku politiku.
- **Feature Block ↔ capability povezivanje** — T2B granica, nije Theme-1 blocker;
  postoji test koji tvrdi da su svi blokovi capability-neutralni.
- **`ServerResolvedQuoteSnapshot` ↔ `Appointment.pricing` konvergencija** — tek uz
  `BookingReservation` write-authority cutover
  ([T3](PANTA-T3-BOOKING-ENGINE.md)).

## 11. Migracije — stanje

| skripta | ishod |
|---|---|
| `backfill:service-intake` | **pokrenuta 2026-09-02.** 4 usluge u 2 salona; verifikacioni dry-run = 0 |
| `backfill:group-price` | **dry-run 2026-09-02: 0 paketa na celoj platformi.** Nema šta da migrira |
| `cleanup:stale-group-items` | 2 usluge (marysoll, anja) — mrtav niz, nije pokrenuta |

Odobreno je bilo 6 usluga, migrirane 4. Razlika nije greška: vlasnica je u
međuvremenu sama uključila checkbox na dve usluge, a selektor
`{ $exists: false }` eksplicitnu odluku admina namerno preskače.

> **Invariant iz te migracije:** `{ $ne: true }` hvata i eksplicitno `false`, pa
> bi backfill vratio `true` preko odluke da zahtev NIJE potreban. Zaključano sa
> testovima u `intakeBackfill.test.ts`.

## 12. Poznat nestabilan test

`bookingCore.integration > resolves a concurrent same-idempotency race as commit
plus replay` pada pod opterećenjem (tipično odmah posle `next build`), nikad
izolovano. Test trke nad pravim replica set-om. Produkcijska logika nije menjana
zbog njega.
