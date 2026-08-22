# TODO — gde smo stali

> Tracker za tekući luk rada: **T3 Booking Engine + Consultation domen + theme-9 „Skincare Marina"**.
> Jedan red po slice-u. Detalji su u dokumentu koji je naveden uz slice — ovde stoji samo status i jedna rečenica.
> Poslednja izmena: 2026-08-22 · grana `product-engines/theme-engine/layout-contract`

## Status

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| H0 | Theme-9 content preservation | ✅ gotovo | Admin forma koristi deljeni lossless write mapper, a server sekcijski dopunjava nepotpun stariji payload. Regresioni testovi čuvaju 7 theme-9 sekcija, hero/about dodatke, `themePages`, `themeBookingPreview`, buduće polje i namerne `[]` / `false` / `""` izmene. | [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md#sledeći-hard-gate) |
| 0A | T2B v0.3 architecture lock | ✅ gotovo | Zaključani su optional `verticals`, legacy beauty runtime default, minimalni tenant override, readiness, jedan server gate i Shared-DB Safety Contract bez obaveznog globalnog backfill-a; foundation implementaciju prati red 0B. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md) |
| 0B | T2B-A capability foundation | ✅ gotovo | Implementirani su optional Tenant persistence ugovor sa očuvanom `undefined` legacy semantikom, registry, pure/server resolver, postojeći plan adapter, `requireCapability()` i eksplicitni beauty provisioning za svaki novi Tenant. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md#9-implementacioni-status) |
| 0C | T2B-B triple-gate integration | ✅ gotovo | Implementirani su server capability snapshot, admin/client workspace projekcija, business API gate-ovi, public Feature Block gate i readiness politika; permission i ownership ostaju zasebne granice. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md#5-jedan-resolver-tri-obavezna-gate-a) |
| 1 | Workspace IA dokument | ✅ gotovo | Zaključane su BEAUTY, EDUCATION-FIRST i HYBRID admin/client matrice, permission i resource-ownership granice. JSX i capability-aware navigacija ostaju Slice 12. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md) |
| 2 | theme-9 prezentacija | 🟡 prikaz gotov; editor/rizici otvoreni | **Urađeno:** registracija na svih 15 mesta, Expert Editorial tokeni u `@theme`, `colorPolicy: locked`, Header/Hero/About/Footer, `Reveal`, renderer mapa, landing + shell, inventar i test (9 tema). **+ 7 novih blok tipova** registrovano (audience-paths, topic-hub, guided-care-process, credentials, featured-education, professional-path, final-cta); HOME kompozicija renderuje ukupno **10 CMS blokova** (hero + 7 novih + about + blog). **+ 13 slika**, data-backed `content.blog`, neutralan `ThemeShellProps`, `/za-klijente` i `/za-profesionalce`. H0 lossless save je zatvoren; otvoreni ostaju urednička polja, neutralan kompletan fallback i content-aware navigacija (header sada može voditi na 404). TODO beleži produkcijski seed Marine 2026-08-20; repozitorijum dokazuje skriptu i strukturu, ali ne može sam potvrditi stanje produkcijske baze. | [PANTA-T2-THEME-LAYOUT-ENGINE.md](PANTA-T2-THEME-LAYOUT-ENGINE.md) + `design/Skincare_Platform_Design-handoff/` |
| 3 | `availability-core` | ✅ gotovo | **Urađeno:** `@panta/booking-engine` — `AvailabilityQuery → AvailabilityResult`, čist TS bez React/Next/DB i bez I/O; `[start, end)`, eksplicitna zona, DST, pauze i odmori kao rez intervala, ručni termini pod istim overlap ugovorom, `availabilityClass` + `outsidePreferredHours` kao ULAZ za Slice 5. Domen ostaje u `lib/booking/availabilityAdapter.ts`. Ponovljena provera: **33 paket testa + 48 adapter/widget testa = 81 fokusirani test**; svi prolaze. Migrirane su obe `slots` rute, oba javna widgeta, `BookingProvider`, `ClientCreateModal`, `ClientEditModal`; stare kopije su uklonjene ili zadržane samo kao zamrznuta regresiona referenca. **Van Slice 3:** serverski upis još ne koristi novi core i ne učitava `vacations`, a modalni tok još ne prima `vacations` kroz ceo lanac propova. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#21-coexistence-i-migracija) |
| 4 | Booking UI apstrakcija | 🟡 prikaz gotov | `useBookingFlow` + theme-9 dijalog, **offering-first**: ponuda → datum i vreme → upitnik → pregled → potvrda (redosled nije kozmetika — vidi ugovor `initialOfferingId` niže). Launcher kroz kontekst, terminologija `offering*`, ne `service*`. **Bez ijednog upisa** — slanje samo šalje mejl vlasnici i superadminu, da potvrdi usluge, cene, termine i pitanja. Ostaje: `bookingProductAdapter` i `BookingThemeTokens` za ostale teme. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#33-readavailability-potrošači-nisu-write-authority) + T2 §6.10/6.11 |
| 5 | ★ T3 Booking Engine CORE | ✅ dark core implementiran | Additive `BookingReservation`, `BookingDayLock`, durable receipt/outbox, neutralne lifecycle komande, write-time availability, legacy reader i Service/Appointment transaction adapter postoje; 31 novi fokusirani test (17 pravi MongoMemoryReplSet) prolazi. **Nije live authority:** production rute nisu migrirane, deployment transaction smoke ostaje hard release gate, a outbox worker/reconciliation i cutover pripadaju Slice 6. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#211-slice-5--dark-core) |
| 6 | ★ Migracija + concurrency gate | ⬜ nije počet | Svih 12 Appointment occupancy/lifecycle ulaza kroz Booking komande; četiri Slot write ulaza migrirana, isključena ili svedena na izvedeni read model; architecture i contention gate. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#212-slice-6--svi-write-ulazi-i-jedan-cutover-gate) |
| 7 | Consultation domen | ⬜ nije počet | `ConsultationOffering` → `ConsultationBooking` → `BookingReservation`. Marinin glavni proizvod; **nije `Service`**. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#142-consultation-i-education-granica) |
| 8 | Hold | ⬜ nije počet | `BookingHold` kroz istu day-lock transakciju; konkretan TTL ostaje product odluka Slice 8. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#20-bookinghold-i-slot-transition) |
| 9 | Questionnaire + Intake | ⬜ nije počet | Guest-first booking ostaje moguć; generički intake čuva immutable početni snapshot, odvaja stručni Current Assessment od originalnog odgovora i kasnije podržava eksplicitni claim/invite identity handoff. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md#4-product-decision--consultation--skin-care-kutak-lifecycle) |
| 10 | ★ theme-9 booking end-to-end | ⬜ nije počet | Hero CTA → widget → modal → intake → preview → hold → atomic booking. **Marina sme primati konsultacije tek odavde.** | PANTA-T3-BOOKING-ENGINE.md |
| 11 | Education domen | ⬜ nije počet | `EducationOffering` + `EducationInquiry`; Featured Offering blok prelazi na domenski tip sa capability-jem. | [PANTA-EDUCATION-VERTICAL.md](PANTA-EDUCATION-VERTICAL.md) |
| 12 | Admin/client navigacija | ⬜ nije počet | Implementacija zaključane IA: Ponuda · Termini/Dostupnost · Klijenti · capability-aware nav. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md) |
| 13 | Care Workspace | ⬜ nije počet | `CareJourney`, strukturisan/verzionisan `CarePlan`, draft/private/shared granica, `CareDocument` PDF/attachment/export, privatni `ProgressMedia` i timeline/history. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md#4-product-decision--consultation--skin-care-kutak-lifecycle) |

Legenda: ⬜ nije počet · 🟡 u toku · ✅ gotovo · ⛔ blokiran

## Tvrde granice

- ✅ **H0 lossless-save gate je zatvoren.** Theme-9 sadržaj sada preživljava
  čuvanje nepovezanih admin polja; produkcijsko uređivanje više nije blokirano
  ovim konkretnim rizikom gubitka sadržaja.
- **Theme-9 ostaje read-only preview i ne koristi stvarni occupancy write pre
  Slice 5–6.** Postojeće `Appointment` write rute su race-unsafe i nisu
  dozvoljeni prečac za Theme-9.
- **Slice 6 concurrency gate mora proći pre Slice 10.** Marina ne prima stvarne rezervacije pre toga.
- **Nijedna API ruta ne sme kreirati ni menjati occupancy mimo Booking Engine-a.**
- **Consultation nije `Service`** — ne sme deliti `services.catalog` ni `booking.services`.
- **Domenski naziv `education.*` uz `capability: null` je zabranjen** — ili domenski blok sa loaderom i capability-jem, ili `content.*` teaser.
- ✅ **T2B triple-gate je implementiran.** Admin/client projekcija, business API
  i public Feature Block gate koriste isti capability autoritet; kompletna nova
  domain IA iz Slice 12 ostaje budući proizvodni rad.
- ✅ **Bezbednosni scope termina je prisutan na aktivnoj grani.** Update i
  message rute koriste `actorScopeFrom()` i tenant/client ownership filter;
  capability i Booking write authority ostaju zasebni otvoreni poslovi.

## Hitno: admin save ne sme da izgubi theme-9 sadržaj

✅ **Zatvoreno u H0.** `useSalonProfileAdmin` koristi deljeni lossless write
mapper koji normalizuje samo polja koja editor poseduje i prenosi ostatak
dokumenta. API više ne zamenjuje sadržaj slepo: nepotpun stariji payload spaja
sa postojećim sadržajem po imenovanim sekcijama, bez vraćanja namerno poslatih
`[]`, `false` ili `""` vrednosti.

Zatvaranje H0 je pokriveno sledećim proverama:

1. lossless mapiranje svih poznatih polja i čuvanje budućih/nepoznatih polja;
2. jedan deljeni lossless write mapper; read projekcije ostaju odvojene jer
   admin, javni API i server-render imaju različite bezbednosne ugovore;
3. test „učitaj theme-9 → promeni nepovezano polje → sačuvaj → sadržaj identičan“;
4. zaseban test za `themePages` i `themeBookingPreview`;
5. kompatibilnost legacy tema 1/2/7/8 i serverska zaštita za stariji payload.

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
| TOCTOU trka pri zakazivanju (nema jedinstvenog occupancy autoriteta, transakcije ni booking idempotencije) | pet create putanja postoje, ali puni inventory ima 12 Appointment occupancy/lifecycle + 4 Slot write ulaza | Slice 5–6; [potpun inventory](PANTA-T3-BOOKING-ENGINE.md#3-potpun-inventar-write-putanja) |
| Reschedule nije centralizovan: opšti update menja datum/vreme bez availability provere, a i dva bolja toka rade odvojeni check + save | `api/appointments/update/[id]` + dva `clientFlows` ulaza | Slice 6; [atomic contract](PANTA-T3-BOOKING-ENGINE.md#13-atomic-reschedule-cancel-i-lifecycle) |
| Legacy marketplace `Slot.reserve` jeste atomski petominutni reserve, ali nema vlasnički token, nije vezan za `Appointment` i ne štiti ostale tokove | `models/Slot.ts`, `api/marketplace/slots/{reserve,book}` | Slice 5/8 — integrisati kao izvedeni prikaz ili ukloniti kao drugi izvor istine |
| ~~Kopije kalendarske logike (bilo ih je PET, ne četiri)~~ ✅ | sve svedeno na `@panta/booking-engine` + `lib/booking/availabilityAdapter.ts` | Slice 3 |
| ~~`getWorkingRange()` briše pauzu — widget i modal se ne slažu~~ ✅ | obrisan zajedno sa `helpers/widgetAvailability.ts` | Slice 3 — rez intervala umesto min/max |
| ~~Widget proverava zauzetost samo nad POČETKOM kandidata — 60-min termin u 11:30 prolazi pored zauzetog u 12:00~~ ✅ | isto | Slice 3 |
| ~~`salon.vacations` se ne gleda pri dostupnosti — može se zakazati usred odmora~~ ✅ | jezgro, obe rute i oba widgeta | Slice 3 — modalni tok još ne prosleđuje `vacations` (lanac propova), zabeleženo uz Slice 3 |
| ~~Theme whitelist pri kreiranju salona ide samo do `theme-6`~~ ✅ | `api/salon-profile/create/route.ts:76` | Slice 2 — popravljeno, sada do `theme-9` |
| ~~`/api/slots` koristi engleske ključeve dana → uvek prazno~~ ✅ (isto i `api/marketplace/slots`) | `api/slots/route.ts`, `api/marketplace/slots/route.ts` | rešeno — obe rute idu kroz `availabilityAdapter` |
| ~~`design/` handoff bundle ulazi u `fallow` analizu~~ ✅ | `.fallowrc.jsonc` | ignore konfiguracija postoji; trenutni workspace nema instaliran `fallow` executable, pa nova health/dead-code analiza nije mogla biti pokrenuta bez instalacije |
| ~~`ThemeShellProps` nosi `salon: SalonProfileData` + `services: IService[]`~~ ✅ | `shells/types.ts` + novi `lib/platform/theme-shell-native.ts` | rešeno — ugovor neutralan, guard test `shells/types.test.ts` |
| ~~Kredencijali se prelazno mapiraju iz `authoredStats` u About~~ ✅ | `about.credentials` | rešeno — About tabela ima svoje polje; blok `content.credentials` nosi stubove i to su dve različite stvari u dizajnu |
| `themeBookingPreview` je PRIVREMENO polje — briše se kad stignu Consultation domen i Booking Engine | `models/SalonProfile.ts` | Slice 5/7 |
| Preview tekst obećava potvrdu/pomeranje termina, a završni ekran tačno kaže da termin nije zakazan | theme-9 seed sadržaj + `Theme9BookingDialog` | pre javnog QA uskladiti poruku tako da korisnica ne pomisli da je zahtev rezervacija |
| `themePages` i 7 theme-9 landing sekcija nemaju urednička polja — sadržaj se za sada autoriše kroz `npm run seed:theme9 -- --tenant=<slug>` | `AdminLandingCMS.tsx` | otvoreno; polja postoje u bazi, ali editor ih ne prikazuje |
| ~~Admin save gubi theme-9 polja iz forme i može njima da prepiše ceo profil~~ ✅ | `useSalonProfileAdmin` → `content-preservation` → `api/salon-profile/update` | **H0 zatvoren — lossless mapper + serverski section merge + regresioni testovi** |
| `theme-3/BlogSection` i dalje dovlači objave klijentskim `useBlogPosts` iako `content.blog` loader sada isporučuje `posts` — isti waterfall koji je theme-9 upravo izgubila | `theme-3/BlogSection.tsx` | otvoreno, sada trivijalno |
| ~~7 theme-9 sekcija nije bilo u mongoose shemi (`strict` bi ih tiho odbacio pri snimanju)~~ ✅ | `models/SalonProfile.ts` | rešeno u ovom slice-u |
| ~~Rute termina su ranije dohvatale/menjale zapis po golom `_id`-ju~~ ✅ | `api/appointments/update/[id]`, `api/appointments/message` | rešeno na aktivnoj grani: `actorScopeFrom()` uvodi tenant i client ownership scope (`ae936af`) |
| **Više ručnih read projekcija istog `SalonProfile` dokumenta** — novo polje može tiho nestati jer su polja opciona | mongoose schema · javni profile API · `ClientHomePage` | otvoren read-model dug; H0 write rizik je zatvoren odvojenim lossless ugovorom |

### Dug: jedan mapper umesto ručnih projekcija

Isti propust se ponovio **tri puta** tokom theme-9 rada, svaki put sa istim
simptomom — polje postoji u bazi, tip ga dozvoljava, a do teme ne stigne:

1. 7 theme-9 landing sekcija nije bilo u mongoose shemi → `strict` ih je tiho
   odbacivao pri snimanju;
2. `shortDescription` / `themePages` / `themeBookingPreview` nisu bili u
   projekciji javnog API-ja → nikad nisu stizali do podstrana;
3. ista tri polja nisu bila u `salonData` u
   [ClientHomePage.tsx](../src/components/client/ClientHomePage.tsx) → launcher
   zakazivanja je renderovan kao `data-booking-launcher="pending"`, dugmad
   vidljiva ali mrtva.
4. admin forma izostavlja 7 landing sekcija i dopunska hero/about polja, a ipak
   šalje ceo objekat na zamenu → čuvanje nepovezanog polja može obrisati sadržaj.

Treći je najskuplji za dijagnozu: strana se renderuje potpuno normalno, jer
sadržaj ide kroz `landingStructure` koji jeste prepisan. Nema greške, nema
praznog stanja — samo dugme koje ne radi.

**Zašto tipovi ne pomažu.** Sva tri polja su opciona na `SalonProfileData`.
Objekat bez njih je validan `SalonProfileData`, pa `tsc` nema šta da prijavi.
Jedini signal je runtime ponašanje.

**H0 odluka:** write putanja sada ima deljeni lossless mapper/patch ugovor i
test koji pada ako Theme-9 polje ponovo bude izostavljeno. Jedan univerzalni
`toSalonProfileData(doc)` nije uveden na silu: admin odgovor sadrži privatna
podešavanja, javni API ima eksplicitnu allowlist projekciju, a server-render
priprema client-safe props. Njihovo spajanje bez prethodno definisanog read
modela moglo bi proširiti javni ugovor ili izložiti privatno polje.

**Sledeće za read dug:** prvo imenovati zasebne `AdminSalonProfileData` i
`PublicSalonProfileData` ugovore; tek zatim izdvojiti mappere po istoj
bezbednosnoj granici. To nije blokada za zatvoreni H0 write gate.

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
