# TODO — gde smo stali

> Tracker za tekući luk rada: **T3 Booking Engine + Consultation domen + theme-9 „Skincare Marina"**.
> Jedan red po slice-u. Detalji su u dokumentu koji je naveden uz slice — ovde stoji samo status i jedna rečenica.
> Poslednja izmena: 2026-08-19 · grana `product-engines/theme-engine/layout-contract`

## Status

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| 0 | Prerequisite gate | ⬜ nije počet | Čeka odvojenu staging bazu, T2B capability resolver i v0.3 dopunu sa `consultations.catalog` / `booking.consultations` / `questionnaires.forms` — ta tri capability-ja danas ne postoje. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md) |
| 1 | IA dokument | ⬜ nije počet | Treba napisati `PANTA-ADMIN-CLIENT-WORKSPACES.md`: tri matrice (beauty / education / hybrid) × admin nav · client nav · capability · resource owner. Blokira svaki admin ekran. | PANTA-ADMIN-CLIENT-WORKSPACES.md *(nastaje ovde)* |
| 2 | theme-9 prezentacija | 🟡 čeka prebacivanje teme | **Urađeno:** registracija na svih 15 mesta, Expert Editorial tokeni u `@theme`, `colorPolicy: locked`, Header/Hero/About/Footer, `Reveal`, renderer mapa, landing + shell, inventar i test (9 tema). **+ 6 novih blok tipova** registrovano (audience-paths, topic-hub, guided-care-process, credentials, featured-education, professional-path) sa CMS sekcijama, loaderima i komponentama; HOME renderuje svih 9 sekcija. **+ 13 slika** ekstrahovano u `public/images/theme-9/` (seed sadržaj, NE fallback teme — vidi README tamo) i `content.blog` dobio data-backed renderer preko `useBlogPosts`. **+ `ThemeShellProps` neutralizovan**, **+ `/za-klijente` i `/za-profesionalce`** (novi `themePages` ugovor, odvojen od `landingStructure`). Slice je gotov osim CMS polja. Sadržaj seed-ovan za `kiki-kiss-beauty` (theme-9, spreman za lokalni pregled) i `marina-…-edukacija` (još na theme-1). | [PANTA-T2-THEME-LAYOUT-ENGINE.md](PANTA-T2-THEME-LAYOUT-ENGINE.md) + `design/Skincare_Platform_Design-handoff/` |
| 3 | `availability-core` | ⬜ nije počet | Spajanje četiri kopije kalendarske logike u jedan modul; `[start, end)`, UTC + timezone, pauze, odmori. | PANTA-T3-BOOKING-ENGINE.md *(nastaje u Slice 5)* |
| 4 | Booking UI apstrakcija | 🟡 prikaz gotov | `useBookingFlow` + theme-9 dijalog (widget → usluga → anketa → pregled → potvrda), launcher kroz kontekst. **Bez ijednog upisa** — slanje samo šalje mejl vlasnici i superadminu, da potvrdi usluge, cene, termine i pitanja. Ostaje: `bookingProductAdapter` i `BookingThemeTokens` za ostale teme. | PANTA-T3-BOOKING-ENGINE.md + T2 §6.10/6.11 |
| 5 | ★ T3 Booking Engine CORE | ⬜ nije počet | `BookingReservation` kao kanonski occupancy, `BookingDayLock` serijalizacija, idempotencija, quote snapshot, conflict recovery, **`BookingFacts` contract** (`availabilityClass`, override i lifecycle činjenice) kao jedini ulaz za budući Pricing/Loyalty obračun. | PANTA-T3-BOOKING-ENGINE.md *(nastaje ovde)* |
| 6 | ★ Migracija + concurrency gate | ⬜ nije počet | Sve write rute na `BookingEngine.reserve()`; architecture test protiv direktnog `appointment.save()`. | PANTA-T3-BOOKING-ENGINE.md |
| 7 | Consultation domen | ⬜ nije počet | `ConsultationOffering` → `ConsultationBooking` → `BookingReservation`. Marinin glavni proizvod; **nije `Service`**. | PANTA-T3-BOOKING-ENGINE.md *(Consultation adapter)* |
| 8 | Hold | ⬜ nije počet | `BookingHold` 7–10 min, `confirmHold()` kroz istu day-lock transakciju. | PANTA-T3-BOOKING-ENGINE.md |
| 9 | Questionnaire + Intake | ⬜ nije počet | Generički `lib/questionnaires/` sa snapshot verzionisanjem; `PendingAppointment` → `BookingDraft`. | PANTA-ADMIN-CLIENT-WORKSPACES.md |
| 10 | ★ theme-9 booking end-to-end | ⬜ nije počet | Hero CTA → widget → modal → intake → preview → hold → atomic booking. **Marina sme primati konsultacije tek odavde.** | PANTA-T3-BOOKING-ENGINE.md |
| 11 | Education domen | ⬜ nije počet | `EducationOffering` + `EducationInquiry`; Featured Offering blok prelazi na domenski tip sa capability-jem. | [PANTA-EDUCATION-VERTICAL.md](PANTA-EDUCATION-VERTICAL.md) |
| 12 | Admin/client navigacija | ⬜ nije počet | Implementacija Slice 1: Ponuda · Termini/Dostupnost · Klijenti · capability-aware nav. | PANTA-ADMIN-CLIENT-WORKSPACES.md |
| 13 | Care Workspace | ⬜ nije počet | Stručni karton, CareJourney, CarePlan verzije, Observations, private/shared granica. | PANTA-ADMIN-CLIENT-WORKSPACES.md |

Legenda: ⬜ nije počet · 🟡 u toku · ✅ gotovo · ⛔ blokiran

## Tvrde granice

- **Theme-9 ne dobija sopstveni booking write put pre Slice 5.** Do tada UI/QA sme koristiti postojeće rute samo u izolovanom test okruženju — race-unsafe su.
- **Slice 6 concurrency gate mora proći pre Slice 10.** Marina ne prima stvarne rezervacije pre toga.
- **Nijedna API ruta ne sme kreirati ni menjati occupancy mimo Booking Engine-a.**
- **Consultation nije `Service`** — ne sme deliti `services.catalog` ni `booking.services`.
- **Domenski naziv `education.*` uz `capability: null` je zabranjen** — ili domenski blok sa loaderom i capability-jem, ili `content.*` teaser.
- **Admin ekrani ne pre Slice 1.**

## Otvorena odluka: prazan CMS ne sme da razbije dizajn

theme-9 sekcije danas **nestaju** kad im je sadržaj prazan. Za Marinu to nije
problem — sve joj je seed-ovano — ali čim se tema dodeli drugom tenantu, on
otvori panel i vidi polovinu strane.

Pravilo koje treba da važi:

> Tenant popunjava ono što mu je omogućeno. Sve ostalo mora da **postoji** — ili
> se menja, ili se uklanja i preuređuje — ali ne sme da naruši vizuelni izgled.

Rešenje **nije** Marinin sadržaj kao runtime fallback: to je njen tekst i njena
biografija. Rešenje su **neutralni tekstovi na nivou teme**, kao što ih theme-8
već ima za svoju vertikalu. Otvoreno je koje sekcije dobijaju neutralan default,
a koje se legitimno gase (npr. Instagram kartica bez naloga nema šta da prikaže).

Odluku doneti **pre nego što tema ode drugom tenantu**, ne pre toga.


## Zaključani engine integration contracts

### Booking → Pricing → Loyalty

Booking Engine je autoritet za **činjenice o rezervaciji i vremenu**. Ne računa
pricing pravila niti loyalty nagrade.

```text
BOOKING ENGINE
utvrđuje činjenice
│
├── bookingId / reservationId
├── tenantId
├── clientId
├── resourceKey
├── productType / productRef
├── startsAt / endsAt
├── duration
├── availabilityClass
│   ├── standard
│   ├── extended
│   └── exceptional
├── outsidePreferredHours
├── ownerOverride + overrideReason
├── reschedule facts
├── late cancellation / no-show
└── completed
        │
        ├──────────────► PRICING ENGINE
        │                računa cenu / surcharge / quote
        │
        └──────────────► LOYALTY ENGINE
                         računa earn / deduct / reward / reversal
```

**Granice:**

- Booking Engine odlučuje da li je termin validan, slobodan i kojoj
  `availabilityClass` pripada.
- Pricing Engine **ne** odlučuje availability; iz Booking činjenica računa cenu,
  surcharge i finalni quote.
- Loyalty Engine **ne** zaključuje sam iz sata da li je termin standardni,
  extended ili exceptional — dobija klasifikovane Booking činjenice.
- Booking Engine **ne** računa loyalty poene niti popuste zbog ponašanja klijenta.
- Loyalty preview pre zakazivanja je **read-only**: `previewReward(bookingFacts)`
  ne menja ledger.
- Stvarni loyalty efekat nastaje tek iz događaja
  `booking.created | rescheduled | completed | no_show | cancelled`
  i mora biti **idempotentan**.
- Pricing/Loyalty rezultat sme biti prikazan korisniku **PRE** finalne potvrde:
  cena, surcharge i očekivana nagrada ne smeju prvi put biti otkriveni tek nakon
  realizacije termina.
- Reversal/correction mora imati **stabilan source/event id** da retry ili isti
  događaj ne može dvaput dodati ili oduzeti vrednost.

**Primer podele:** salon definiše 09–18 standard, 18–21 extended, 21–00 i 05:00
exceptional. Booking Engine vraća samo `{ startsAt, endsAt, availabilityClass:
"exceptional", outsidePreferredHours: true }`. Pricing iz toga računa `+30%`,
Loyalty potpuno nezavisno `redovan dolazak +2`, `bez kasnog pomeranja +1`,
`late reschedule −2`. Korisnica pre klika `Zakaži` vidi i cenu sa dodatkom i
očekivane poene.

**Zašto se zaključava sada, a ne kad Pricing Engine bude postojao:** problem
ponovne obrade već postoji i danas je rešen lokalno na modelu —
`Appointment.loyaltyProcessed { completed, noShow, revertCount }`
([Appointment.ts:103](../src/models/Appointment.ts#L103)), gde `revertCount`
ulazi u event `sourceId` da bi ponovni completion posle reverta mogao ponovo da
nagradi. T3 je prilika da to preraste u čist ugovor
`booking događaj → event/source id → Loyalty Engine → ledger → idempotency/reversal`.

> **Ovo NIJE nalog za novi Pricing/Loyalty slice.** Ne pravi se „Slice 14 Pricing
> Engine" niti se dira postojeća Loyalty implementacija. Zapisuje se samo ugovor,
> da T3 proizvede dovoljno dobre činjenice i da niko kasnije ne ugura obračun
> poena ili surcharge direktno u Booking Engine.


## Zatečeni dugovi koje ovaj luk zatvara

| Dug | Gde | Zatvara ga |
|---|---|---|
| TOCTOU trka pri zakazivanju (nema unique indeksa, transakcije ni idempotencije) | `api/appointments/create`, `.../guest`, `create-guest`, `marketplace/appointments` | Slice 5–6 |
| Reschedule menja datum i vreme bez ijedne provere dostupnosti | `api/appointments/update/[id]` | Slice 6 |
| Četiri kopije kalendarske logike + 1:1 klon widgeta | `helpers/widgetAvailability.ts`, `parseWorkingHours.ts`, `api/slots/route.ts`, `AppointmentCalendarPage.tsx`, `Y2KHomepageAppointmentWidget.tsx` | Slice 3 |
| `getWorkingRange()` briše pauzu — widget i modal se ne slažu | `helpers/widgetAvailability.ts` | Slice 3 |
| `salon.vacations` se ne gleda pri dostupnosti — može se zakazati usred odmora | availability putanja | Slice 3 |
| ~~Theme whitelist pri kreiranju salona ide samo do `theme-6`~~ ✅ | `api/salon-profile/create/route.ts:76` | Slice 2 — popravljeno, sada do `theme-9` |
| `/api/slots` koristi engleske ključeve dana, ostatak baze srpske → vraća prazno | `api/slots/route.ts:22` | Slice 3 |
| ~~`design/` handoff bundle ulazi u `fallow` analizu~~ ✅ | `.fallowrc.jsonc` | rešeno — `ignorePatterns` za `design/`, `docs/`, `public/`, `.next/`, `scripts/`; 8942 → 6471 analiziranih |
| ~~`ThemeShellProps` nosi `salon: SalonProfileData` + `services: IService[]`~~ ✅ | `shells/types.ts` + novi `lib/platform/theme-shell-native.ts` | rešeno — ugovor neutralan, guard test `shells/types.test.ts` |
| ~~Kredencijali se prelazno mapiraju iz `authoredStats` u About~~ ✅ | `about.credentials` | rešeno — About tabela ima svoje polje; blok `content.credentials` nosi stubove i to su dve različite stvari u dizajnu |
| `themeBookingPreview` je PRIVREMENO polje — briše se kad stignu Consultation domen i Booking Engine | `models/SalonProfile.ts` | Slice 5/7 |
| `themePages` i 6 theme-9 landing sekcija nemaju CMS polja — sadržaj se za sada autoriše kroz `npm run seed:theme9 -- --tenant=<slug>` | `AdminLandingCMS.tsx` | otvoreno; seed piše u ISTA polja, pa kad editor stigne ništa se ne migrira |
| `theme-3/BlogSection` i dalje dovlači objave klijentskim `useBlogPosts` iako `content.blog` loader sada isporučuje `posts` — isti waterfall koji je theme-9 upravo izgubila | `theme-3/BlogSection.tsx` | otvoreno, sada trivijalno |
| 6 theme-9 sekcija nije bilo u mongoose shemi (`strict` bi ih tiho odbacio pri snimanju) ✅ | `models/SalonProfile.ts` | rešeno u ovom slice-u |
