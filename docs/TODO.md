# TODO — gde smo stali

> Tracker za tekući luk rada: **T3 Booking Engine + Consultation domen + theme-9 „Skincare Marina"**.
> Jedan red po slice-u. Detalji su u dokumentu koji je naveden uz slice — ovde stoji samo status i jedna rečenica.
> Poslednja izmena: 2026-08-19 · grana `product-engines/theme-engine/layout-contract`

## Status

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| 0 | Prerequisite gate | ⬜ nije počet | Čeka odvojenu staging bazu, T2B capability resolver i v0.3 dopunu sa `consultations.catalog` / `booking.consultations` / `questionnaires.forms` — ta tri capability-ja danas ne postoje. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md) |
| 1 | IA dokument | ⬜ nije počet | Treba napisati `PANTA-ADMIN-CLIENT-WORKSPACES.md`: tri matrice (beauty / education / hybrid) × admin nav · client nav · capability · resource owner. Blokira svaki admin ekran. | PANTA-ADMIN-CLIENT-WORKSPACES.md *(nastaje ovde)* |
| 2 | theme-9 prezentacija | 🟡 u toku | **Urađeno:** registracija na svih 15 mesta, Expert Editorial tokeni u `@theme`, `colorPolicy: locked`, Header/Hero/About/Footer, `Reveal`, renderer mapa, landing + shell, inventar i test (9 tema). **Sledeće:** 6 novih blok tipova (audience-paths, topic-hub, guided-care-process, credentials, featured-education, professional-path), ekstrakcija 13 slika iz `.image-slots.state.json`, pa **neutralizacija `ThemeShellProps`**, pa `/za-klijente` i `/za-profesionalce`. | [PANTA-T2-THEME-LAYOUT-ENGINE.md](PANTA-T2-THEME-LAYOUT-ENGINE.md) + `design/Skincare_Platform_Design-handoff/` |
| 3 | `availability-core` | ⬜ nije počet | Spajanje četiri kopije kalendarske logike u jedan modul; `[start, end)`, UTC + timezone, pauze, odmori. | PANTA-T3-BOOKING-ENGINE.md *(nastaje u Slice 5)* |
| 4 | Booking UI apstrakcija | ⬜ nije počet | `useBookingFlow({ bookingProductAdapter, presentation })` + `BookingThemeTokens`. **Bez production write-a.** | PANTA-T3-BOOKING-ENGINE.md + T2 §6.10/6.11 |
| 5 | ★ T3 Booking Engine CORE | ⬜ nije počet | `BookingReservation` kao kanonski occupancy, `BookingDayLock` serijalizacija, idempotencija, quote snapshot, conflict recovery. | PANTA-T3-BOOKING-ENGINE.md *(nastaje ovde)* |
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
| `ThemeShellProps` još nosi `salon: SalonProfileData` + `services: IService[]` — zatečeni T2A dug koji `ThemeLandingProps` više nema. Education-first tenant ga prvi razotkriva. | `components/themes/shells/types.ts`, `TenantShellClient.tsx` | Slice 2 — **pre** `/za-klijente` i `/za-profesionalce` |
| Kredencijali se prelazno mapiraju iz `authoredStats` u About | `theme-9/blockProps.ts` | briše se kad stigne blok `content.credentials` |
