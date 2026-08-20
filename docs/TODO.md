# TODO — gde smo stali

> Tracker za tekući luk rada: **T3 Booking Engine + Consultation domen + theme-9 „Skincare Marina"**.
> Jedan red po slice-u. Detalji su u dokumentu koji je naveden uz slice — ovde stoji samo status i jedna rečenica.
> Poslednja izmena: 2026-08-20 · grana `product-engines/theme-engine/layout-contract`

## Status

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| 0 | Prerequisite gate | ⬜ nije počet | Čeka odvojenu staging bazu, T2B capability resolver i v0.3 dopunu sa `consultations.catalog` / `booking.consultations` / `questionnaires.forms` — ta tri capability-ja danas ne postoje. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md) |
| 1 | IA dokument | ⬜ nije počet | Treba napisati `PANTA-ADMIN-CLIENT-WORKSPACES.md`: tri matrice (beauty / education / hybrid) × admin nav · client nav · capability · resource owner. Blokira svaki admin ekran. | PANTA-ADMIN-CLIENT-WORKSPACES.md *(nastaje ovde)* |
| 2 | theme-9 prezentacija | 🟡 čeka CMS polja | **Urađeno:** registracija na svih 15 mesta, Expert Editorial tokeni u `@theme`, `colorPolicy: locked`, Header/Hero/About/Footer, `Reveal`, renderer mapa, landing + shell, inventar i test (9 tema). **+ 6 novih blok tipova** registrovano (audience-paths, topic-hub, guided-care-process, credentials, featured-education, professional-path) sa CMS sekcijama, loaderima i komponentama; HOME renderuje svih 9 sekcija. **+ 13 slika** ekstrahovano u `public/images/theme-9/` (seed sadržaj, NE fallback teme — vidi README tamo) i `content.blog` dobio data-backed renderer preko `useBlogPosts`. **+ `ThemeShellProps` neutralizovan**, **+ `/za-klijente` i `/za-profesionalce`** (novi `themePages` ugovor, odvojen od `landingStructure`). Slice je gotov osim CMS polja. Sadržaj seed-ovan za `kiki-kiss-beauty` (lokalni pregled) i za `marina-stanisavljevic-skincare-edukacija` — **taj tenant je već prebačen na theme-9 i seed je odrađen nad produkcijskom bazom 2026-08-20** (7 landing sekcija + `themePages` + `themeBookingPreview`; `hero`/`about`/`blog`/`shortDescription` NISU dirani, oni idu samo uz `--overwrite-shared`). | [PANTA-T2-THEME-LAYOUT-ENGINE.md](PANTA-T2-THEME-LAYOUT-ENGINE.md) + `design/Skincare_Platform_Design-handoff/` |
| 3 | `availability-core` | ✅ gotovo | **Urađeno:** `@panta/booking-engine` — `AvailabilityQuery → AvailabilityResult`, čist TS bez React/Next/DB i bez I/O; `[start, end)`, eksplicitna zona, DST (prolećni dan ima 23 sata, nepostojeći sat se ne nudi), pauze i odmori kao rez intervala, ručni termini pod istim overlap ugovorom, `availabilityClass` + `outsidePreferredHours` kao ULAZ za Slice 5. Domen ostaje u `lib/booking/availabilityAdapter.ts` (srpski dani, legacy string, statusi, `SalonProfile`). 63 testa + guard granice paketa + regresija protiv zatečenih kopija (paritet gde nije bilo buga, **namerna razlika** za pauzu/odmor/srpski dan). Migrirane 2 rute: `/api/slots` i `/api/marketplace/slots` (obe su zbog engleskih ključeva dana praktično uvek vraćale prazno). **Migrirano je sve:** obe `slots` rute, oba javna widgeta (`HomepageAppointmentWidget`, `Y2K…`), `BookingProvider`, `ClientCreateModal`, `ClientEditModal`. `helpers/widgetAvailability.ts` je OBRISAN, a `availableTimesForDate` izvađen iz `helpers/parseWorkingHours.ts` (tamo je ostalo samo parsiranje i prikaz). Stare implementacije žive kao zamrznut snimak u regresionom testu, da dokaz ostane proverljiv i posle brisanja. Widgeti sada prosleđuju i `vacations` — javni profil ih je vraćao oduvek, ali ih niko nije čitao. **Ostaje van Slice 3:** `isWithinWorkingHours` (server-side validacija upisa) ide na Booking Engine u Slice 5/6, a modalni tok još ne prima `vacations` kroz lanac propova. | PANTA-T3-BOOKING-ENGINE.md *(nastaje u Slice 5)* |
| 4 | Booking UI apstrakcija | 🟡 prikaz gotov | `useBookingFlow` + theme-9 dijalog, **offering-first**: ponuda → datum i vreme → upitnik → pregled → potvrda (redosled nije kozmetika — vidi ugovor `initialOfferingId` niže). Launcher kroz kontekst, terminologija `offering*`, ne `service*`. **Bez ijednog upisa** — slanje samo šalje mejl vlasnici i superadminu, da potvrdi usluge, cene, termine i pitanja. Ostaje: `bookingProductAdapter` i `BookingThemeTokens` za ostale teme. | PANTA-T3-BOOKING-ENGINE.md + T2 §6.10/6.11 |
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
| ~~Kopije kalendarske logike (bilo ih je PET, ne četiri)~~ ✅ | sve svedeno na `@panta/booking-engine` + `lib/booking/availabilityAdapter.ts` | Slice 3 |
| ~~`getWorkingRange()` briše pauzu — widget i modal se ne slažu~~ ✅ | obrisan zajedno sa `helpers/widgetAvailability.ts` | Slice 3 — rez intervala umesto min/max |
| ~~Widget proverava zauzetost samo nad POČETKOM kandidata — 60-min termin u 11:30 prolazi pored zauzetog u 12:00~~ ✅ | isto | Slice 3 |
| ~~`salon.vacations` se ne gleda pri dostupnosti — može se zakazati usred odmora~~ ✅ | jezgro, obe rute i oba widgeta | Slice 3 — modalni tok još ne prosleđuje `vacations` (lanac propova), zabeleženo uz Slice 3 |
| ~~Theme whitelist pri kreiranju salona ide samo do `theme-6`~~ ✅ | `api/salon-profile/create/route.ts:76` | Slice 2 — popravljeno, sada do `theme-9` |
| ~~`/api/slots` koristi engleske ključeve dana → uvek prazno~~ ✅ (isto i `api/marketplace/slots`) | `api/slots/route.ts`, `api/marketplace/slots/route.ts` | rešeno — obe rute idu kroz `availabilityAdapter` |
| ~~`design/` handoff bundle ulazi u `fallow` analizu~~ ✅ | `.fallowrc.jsonc` | rešeno — `ignorePatterns` za `design/`, `docs/`, `public/`, `.next/`, `scripts/`; 8942 → 6471 analiziranih |
| ~~`ThemeShellProps` nosi `salon: SalonProfileData` + `services: IService[]`~~ ✅ | `shells/types.ts` + novi `lib/platform/theme-shell-native.ts` | rešeno — ugovor neutralan, guard test `shells/types.test.ts` |
| ~~Kredencijali se prelazno mapiraju iz `authoredStats` u About~~ ✅ | `about.credentials` | rešeno — About tabela ima svoje polje; blok `content.credentials` nosi stubove i to su dve različite stvari u dizajnu |
| `themeBookingPreview` je PRIVREMENO polje — briše se kad stignu Consultation domen i Booking Engine | `models/SalonProfile.ts` | Slice 5/7 |
| `themePages` i 6 theme-9 landing sekcija nemaju CMS polja — sadržaj se za sada autoriše kroz `npm run seed:theme9 -- --tenant=<slug>` | `AdminLandingCMS.tsx` | otvoreno; seed piše u ISTA polja, pa kad editor stigne ništa se ne migrira |
| `theme-3/BlogSection` i dalje dovlači objave klijentskim `useBlogPosts` iako `content.blog` loader sada isporučuje `posts` — isti waterfall koji je theme-9 upravo izgubila | `theme-3/BlogSection.tsx` | otvoreno, sada trivijalno |
| 6 theme-9 sekcija nije bilo u mongoose shemi (`strict` bi ih tiho odbacio pri snimanju) ✅ | `models/SalonProfile.ts` | rešeno u ovom slice-u |
| ~~Termin se dohvatao po golom `_id`-ju — svaki ulogovan korisnik je mogao da izmeni ili komentariše tuđi termin, i u tuđem salonu~~ ✅ | `api/appointments/update/[id]`, `api/appointments/message`, `api/testimonials/create` | rešeno van ovog luka — `actorScopeFrom` (tenant + `clientProfileId`) + guard test protiv `Appointment.findById*`; commit na `staging/production-fixes` |
| **Tri ručne projekcije istog `SalonProfile` dokumenta** — svako novo polje mora u sve tri ili tiho nestane, a TypeScript ne hvata nijednu (sva su polja opciona, pa je izostavljanje validan objekat) | mongoose shema `models/SalonProfile.ts` (upis) · `api/public/[tenantSlug]/salon-profile/route.ts` (API) · `client/ClientHomePage.tsx` `salonData` (strana) | **otvoreno — vidi belešku ispod** |

### Dug: jedan mapper umesto tri ručne projekcije

Isti propust se ponovio **tri puta** tokom theme-9 rada, svaki put sa istim
simptomom — polje postoji u bazi, tip ga dozvoljava, a do teme ne stigne:

1. 6 theme-9 landing sekcija nije bilo u mongoose shemi → `strict` ih je tiho
   odbacivao pri snimanju;
2. `shortDescription` / `themePages` / `themeBookingPreview` nisu bili u
   projekciji javnog API-ja → nikad nisu stizali do podstrana;
3. ista tri polja nisu bila u `salonData` u
   [ClientHomePage.tsx](../src/components/client/ClientHomePage.tsx) → launcher
   zakazivanja je renderovan kao `data-booking-launcher="pending"`, dugmad
   vidljiva ali mrtva.

Treći je najskuplji za dijagnozu: strana se renderuje potpuno normalno, jer
sadržaj ide kroz `landingStructure` koji jeste prepisan. Nema greške, nema
praznog stanja — samo dugme koje ne radi.

**Zašto tipovi ne pomažu.** Sva tri polja su opciona na `SalonProfileData`.
Objekat bez njih je validan `SalonProfileData`, pa `tsc` nema šta da prijavi.
Jedini signal je runtime ponašanje.

**Predlog:** jedan deljeni `toSalonProfileData(doc)` u `lib/tenant/`, koji sve
tri putanje pozivaju, plus test koji poredi ključeve rezultata sa poljima
`SalonProfileData` i pada kad se pojavi polje koje mapper ne prepisuje.

**Kada:** pre CMS polja za theme-9 sekcije. Tada u profil ulazi desetak novih
polja odjednom, i ovaj propust prestaje da bude jednokratna greška — postaje
sistematičan.

### Ugovor: `initialOfferingId` — CTA sa kartice ne ponavlja korak 01

Tok zakazivanja je **offering-first**: ponuda → termin → upitnik → pregled.
Redosled nije kozmetika — tek kad je ponuda poznata, poznati su `duration` i
`resource`, pa Booking Engine uopšte može da odgovori koji su datumi i slotovi
slobodni i šta je `firstAvailable`.

Iz toga slede dva ulaza u **isti** tok:

```
GENERIČKI CTA                      CTA SA KARTICE PONUDE
„Zakaži konsultaciju"              [Individualna konsultacija] [Zakaži]
        ↓                                    ↓
01 Ponuda                          offeringId već poznat → korak 01 se preskače
02 Datum i vreme                   02 Datum i vreme
03 Intake                          03 Intake
04 Pregled                         04 Pregled
```

```ts
useBookingFlow({ initialOfferingId?: string })
```

**Isti hook, drugo ulazno stanje — nikad drugi tok.** Ako se pojavi drugi tok,
availability i intake se granaju po ulaznoj tački i to se više ne vraća.

Nije implementirano jer takav CTA još ne postoji; zapisano da se ne izgubi kad
Consultation domen (Slice 7) donese kartice pojedinačnih ponuda.

**Terminologija je već očišćena:** prikaz koristi `offerings` / `offeringId` /
`offeringTitle` / `pickOffering()`, ne `service*`. Privremeni prikaz ne sme kroz
mala vrata vratiti jednačinu `Consultation = Service`, koju Slice 7 postoji da
razdvoji.
