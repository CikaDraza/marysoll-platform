# TODO — gde smo stali

> Tracker za tekući luk rada: **T3 Booking Engine + Consultation domen + theme-9 „Skincare Marina"**.
> Jedan red po slice-u. Detalji su u dokumentu koji je naveden uz slice — ovde stoji samo status i jedna rečenica.
> Poslednja izmena: 2026-08-27 · `main` + Theme-9 content contract cleanup
>
> **Aktuelno stanje:** correctness fixes, Theme-9 **2A, ceo 2B i 2C** i
> migration/staging tooling nalaze se na `main`-u. Staging Release A + migration
> rehearsal je završen nad staging DB-om. Content contract cleanup zatvara
> runtime/CMS/starter granice; nema neutralnog javnog fallback sadržaja.
>
> ```text
> 2A            ✅ razvoj
> 2B            ✅ razvoj
> 2C            ✅ razvoj
> Release A     ✅ staging rehearsal
> content cleanup ✅
> Edu F0         ✅ staging
> Edu F1         ✅ staging
> ```
>
> Dalji Theme-9 završetak, QA i Edu Centar razvoj nastavljaju se samo na aktivnoj
> staging razvojnoj liniji; produkcijski rollout ostaje zasebna release odluka.

## Status

> Roadmap je usklađen sa novim Edu lukom. Stari Slice 11 je **razložen** u
> [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md), stari Slice 12 je time
> **većim delom preuzet**, a stari Slice 13 je **odložen** dok ne vidimo šta
> Guide i Program stvarno traže u praksi. Booking/Consultation luk **ostaje
> netaknut**.

### Aktivno

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| 2 | theme-9 prezentacija | ✅ 2A · 2B · 2C · content cleanup | Theme-9 foundation je na `main`-u: persistence, tri-state, konzervativna normalizacija, fail-closed presentation resolver, 7/7 CMS authoring + minimum validacija i content-aware page/navigation resolver. Staging Release A/migration rehearsal je završen. Starter seed je provisioning koji defaultno čuva tenant-authored sadržaj. Dalji razvoj/QA je staging-only. | [PANTA-T2-THEME-LAYOUT-ENGINE.md](PANTA-T2-THEME-LAYOUT-ENGINE.md) |
| Edu F0 | Vertical & workspace foundation | ✅ staging | Preset-aware onboarding, neutralni registration contract/UI, zaključano provisioning jezgro i `/education/{offerings,inquiries}` boundary su implementirani. Salon dashboard i Theme-9 nisu dirani. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-0--vertical--workspace-foundation) |
| Edu F1 | Content Composer | ✅ staging | Generički editor/render/schema/registry/score/SEO sloj je izdvojen, newsletter je ostao tanak adapter, a oba renderera koriste jedan `BlockList`. Karakterizacioni testovi čuvaju postojeći Newsletter contract. F2 nije počela. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-1--content-composer-deljeni-sloj) |

### Booking / Consultation — zadržano

Novi Edu luk **ništa od ovoga ne zamenjuje** i izričito ne dira Booking Engine.

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| 4 | Booking UI apstrakcija | 🟡 prikaz gotov | `useBookingFlow` + theme-9 dijalog, **offering-first**: ponuda → datum i vreme → upitnik → pregled → potvrda (redosled nije kozmetika — vidi ugovor `initialOfferingId` niže). Launcher kroz kontekst, terminologija `offering*`, ne `service*`. **Bez ijednog upisa** — slanje samo šalje mejl vlasnici i superadminu, da potvrdi usluge, cene, termine i pitanja. Ostaje: `bookingProductAdapter` i `BookingThemeTokens` za ostale teme. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#33-readavailability-potrošači-nisu-write-authority) + T2 §6.10/6.11 |
| 6 | ★ Migracija + concurrency gate | ⏸ planski odloženo | **Završeno:** Slice 5 dark core, 6A transition hardening i empirijski gate-ovi (T3 §21.2.4). **Odloženo:** production `Appointment` write migracija i Booking cutover nastavljaju se posle Marysoll platform/marketplace upgrade-a. Trenutno nema aktivnih Booking korisnika, pa nema poslovnog razloga za promenu production write authority-ja. Nijedna od 12 ruta se ne dira; Slot endpoint-i se ne gase samo radi arhitektonske čistoće. `BookingReservation` ostaje dark-core infrastruktura, ne production authority. Pripremljen obim za nastavak: 8 platformskih ulaza (T3 §21.2.6); empiriju iz §21.2.4 pre nastavka premeriti. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#213-slice-6b6c--planski-odloženo-2026-08-23) |
| 7 | Consultation domen | ⬜ nije počet | `ConsultationOffering` → `ConsultationBooking` → `BookingReservation`. Marinin glavni proizvod; **nije `Service`**. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#142-consultation-i-education-granica) |
| 8 | Hold | ⬜ nije počet | `BookingHold` kroz istu day-lock transakciju; konkretan TTL ostaje product odluka Slice 8. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#20-bookinghold-i-slot-transition) |
| 9 | Questionnaire + Intake | ⬜ nije počet | Guest-first booking ostaje moguć; generički intake čuva immutable početni snapshot, odvaja stručni Current Assessment od originalnog odgovora i kasnije podržava eksplicitni claim/invite identity handoff. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md#4-product-decision--consultation--skin-care-kutak-lifecycle) |
| 10 | ★ theme-9 booking end-to-end | ⬜ nije počet | Hero CTA → widget → modal → intake → preview → hold → atomic booking. **Marina sme primati konsultacije tek odavde.** | PANTA-T3-BOOKING-ENGINE.md |

### Education → zaseban dokument

Stari red „11 Education domen" **više ne postoji kao jedan slice**. Zamenjen je
kanonskim dokumentom [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md):

```text
F0   vertical / workspace foundation      F5   /edukacija → RELEASE GATE
F1   Content Composer                     F6A  Client Workspace + Moj Prostor
F2   novi blokovi + rupe u editoru        F6B  assignment + ACL
F3   capability wiring                    F7   transakciono obaveštenje
F4   EducationContent + Edu Studio        F8   SkincareGuide
F4B  EducationOffering + EducationInquiry F9   GuidedProgram
                                          F10  AI asistencija
```

`EducationOffering` i `EducationInquiry` iz starog Slice 11 nisu izgubljeni —
žive u **Fazi 4B**.

✅ **Faze 0 i 1 su završene na aktivnoj staging razvojnoj liniji. Faza 2 nije počela.**

### Završeno

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| H0 | Theme-9 content preservation | ✅ gotovo | Admin forma koristi deljeni lossless write mapper, a server sekcijski dopunjava nepotpun stariji payload. Regresioni testovi čuvaju 7 theme-9 sekcija, hero/about dodatke, `themePages`, `themeBookingPreview`, buduće polje i namerne `[]` / `false` / `""` izmene. | [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md#sledeći-hard-gate) |
| 0A | T2B v0.3 architecture lock | ✅ gotovo | Zaključani su optional `verticals`, legacy beauty runtime default, minimalni tenant override, readiness, jedan server gate i Shared-DB Safety Contract bez obaveznog globalnog backfill-a; foundation implementaciju prati red 0B. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md) |
| 0B | T2B-A capability foundation | ✅ gotovo | Implementirani su optional Tenant persistence ugovor sa očuvanom `undefined` legacy semantikom, registry, pure/server resolver, postojeći plan adapter, `requireCapability()` i eksplicitni beauty provisioning za svaki novi Tenant. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md#9-implementacioni-status) |
| 0C | T2B-B triple-gate integration | ✅ gotovo | Implementirani su server capability snapshot, admin/client workspace projekcija, business API gate-ovi, public Feature Block gate i readiness politika; permission i ownership ostaju zasebne granice. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md#5-jedan-resolver-tri-obavezna-gate-a) |
| 1 | Workspace IA dokument | ✅ gotovo | Zaključane su BEAUTY, EDUCATION-FIRST i HYBRID admin/client matrice, permission i resource-ownership granice. JSX i capability-aware navigacija su preuzeti Edu lukom (Faza 0 i 6A); ostatak je „Salon workspace migration" u Kasnije. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md) |
| 3 | `availability-core` | ✅ gotovo | **Urađeno:** `@panta/booking-engine` — `AvailabilityQuery → AvailabilityResult`, čist TS bez React/Next/DB i bez I/O; `[start, end)`, eksplicitna zona, DST, pauze i odmori kao rez intervala, ručni termini pod istim overlap ugovorom, `availabilityClass` + `outsidePreferredHours` kao ULAZ za Slice 5. Domen ostaje u `lib/booking/availabilityAdapter.ts`. Ponovljena provera: **33 paket testa + 48 adapter/widget testa = 81 fokusirani test**; svi prolaze. Migrirane su obe `slots` rute, oba javna widgeta, `BookingProvider`, `ClientCreateModal`, `ClientEditModal`; stare kopije su uklonjene ili zadržane samo kao zamrznuta regresiona referenca. **Van Slice 3:** serverski upis još ne koristi novi core i ne učitava `vacations`, a modalni tok još ne prima `vacations` kroz ceo lanac propova. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#21-coexistence-i-migracija) |
| 5 | ★ T3 Booking Engine CORE | ✅ dark core implementiran | Additive `BookingReservation`, `BookingDayLock`, durable receipt/outbox, neutralne lifecycle komande, write-time availability, legacy reader i Service/Appointment transaction adapter postoje; 35 novih fokusiranih testova (21 pravi MongoMemoryReplSet) prolaze. **Nije live authority:** production rute nisu migrirane, deployment transaction smoke ostaje hard release gate, a outbox worker/reconciliation i cutover pripadaju Slice 6. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#211-slice-5--dark-core) |

### Kasnije — bez datuma

| Šta | Odakle | Zašto čeka |
|---|---|---|
| **Salon workspace migration** | ostatak starog Slice 12 | Edu plan je preuzeo `/education/*`, `Moj Prostor` i Client 360. Ostaje samo prevođenje ~15 salon tabova u workspace strukturu — nije prioritet za Marinu |
| **Generic Care Domain** | stari Slice 13, preimenovan | `CareJourney` / `CarePlan` / `CareDocument` / `ProgressMedia`. Prvo vidimo šta `SkincareGuide` + `GuidedProgram` + follow-up stvarno traže, pa tek onda generalizujemo — sigurnije od apstrakcije unapred |
| **Jedan `AuthUser` → više `Tenant`-a** | Edu plan, Faza 0 | Jedini ispravan put za potpuno odvojene Salon/Education biznise istog vlasnika. „Neka napravi drugi nalog" ne radi: `AuthUser.email` je globalno unique, register vraća 409 |
| **Read-model cleanup** | dug iz H0 | Write loss je zatvoren; višestruke ručne read projekcije `SalonProfile` ostaju |

Legenda: ⬜ nije počet · 🟡 u toku · ✅ gotovo · ⛔ blokiran · ⏸ planski odloženo

## Tvrde granice

- ✅ **H0 lossless-save gate je zatvoren.** Theme-9 sadržaj sada preživljava
  čuvanje nepovezanih admin polja; produkcijsko uređivanje više nije blokirano
  ovim konkretnim rizikom gubitka sadržaja.
- **Theme-9 ostaje read-only preview i ne koristi stvarni occupancy write pre
  Slice 5–6.** Postojeće `Appointment` write rute su race-unsafe i nisu
  dozvoljeni prečac za Theme-9.
- **Slice 6 concurrency gate mora proći pre Slice 10.** Marina ne prima stvarne rezervacije pre toga.
  Slice 6B/6C su planski odloženi (vidi red 6), pa je i Slice 10 time odložen.
- **Nijedan legacy zapis ne sme prestati da blokira u odnosu na zatečeno ponašanje.**
  Legacy `no_show` nastaje i pri kasnom otkazu, dakle pre kraja termina — zato je
  `blocking_until_end`, ne `released`. Vidi T3 §21.2.1.
- **Nijedna API ruta ne sme kreirati ni menjati occupancy mimo Booking Engine-a.**
- **Salon nikada ne postoji bez vlasnika, ni vlasnički nalog bez salona.**
  Jedina destruktivna owner akcija je „Trajno obriši salon", koja briše ceo
  tenant boundary. Ownership transfer je specifikovan i ODLOŽEN — vidi
  [PANTA-TENANT-OWNERSHIP-LIFECYCLE.md](PANTA-TENANT-OWNERSHIP-LIFECYCLE.md).
- **Consultation nije `Service`** — ne sme deliti `services.catalog` ni `booking.services`.
- **Domenski naziv `education.*` uz `capability: null` je zabranjen** — ili domenski blok sa loaderom i capability-jem, ili `content.*` teaser.
- ✅ **T2B triple-gate je implementiran.** Admin/client projekcija, business API
  i public Feature Block gate koriste isti capability autoritet; kompletna nova
  domain IA je preuzeta Edu lukom (Faza 0 i 6A); Salon workspace migration ostaje budući rad.
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

## Slice 2 — Theme-9 · razlaganje

Slice 2 je prerastao jedan red u tabeli. Ovo je zvanično razlaganje; tabela gore
pokazuje samo zbir.

| Korak | Status | Šta znači | Gde živi |
|---|---|---|---|
| **2A.0** persistence drift guard | ✅ | `LANDING_PERSISTED_KEYS` + compile-time i Mongoose schema provere | `main` |
| **2A.1** `landing.stats` persistence | ✅ | Polje koje čita šest tema sada se čuva u strict šemi | `main` |
| **2A.2** CMS editor za 7 blokova | ✅ | 7/7 editor coverage + missing=Podrazumevano + minimum-content save gate | `main` |
| **2B.0** tri-state šema | ✅ | `default: false` uklonjen; `enabled` ostaje opcion | `main` |
| **2B.0d** staging Release A rehearsal | ✅ | Tri-state deploy/migration redosled potvrđen nad staging DB-om | staging evidencija |
| **2B.1** legacy implicit-false normalizacija | ✅ | Konzervativni dry-run/apply alat i idempotency test; rehearsal završen na staging-u | `main` |
| **2B.2–2B.3** presentation contract | ✅ | `false` je veto; meaningful persisted content se renderuje; prazno je hidden; neutral/default runtime grana uklonjena | `main` |
| **2B.4** CMS tri-state kontrola | ✅ | Podrazumevano/uključeno/isključeno, bez synthetic ON za missing blok | `main` |
| **2C** content-aware page/navigation resolver | ✅ | Nav i ruta čitaju isto pravilo; Header/Footer ne grade rute | `main` |

### Tri-state ugovor (2B.0, zaključan)

```text
undefined  → nema eksplicitne odluke; persisted sadržaj odlučuje da li ima šta da se prikaže
true       → vlasnica traži sekciju
false      → vlasnica zabranjuje; apsolutni veto
```

### Redosled izdavanja — potvrđen staging rehearsal

Ovo je preciznije od „2B.2 je blokiran 2B.1-om". Kod sme da nastane ranije;
**deploy** je ono što je uslovljeno.

Implementacioni redosled je završen:

```text
2B.1 migration script
  → 2B.2 resolver
    → 2B.3 content contract
      → 2B.4 CMS
```

Staging rehearsal je potvrdio obavezni release redosled:

```text
RELEASE A
  2A + 2B.0 tri-state šema
  + migration script, BEZ automatskog izvršavanja
        ↓
  staging deploy potvrđen
        ↓
  2B.1 --dry-run
        ↓
  pregled reporta
        ↓
  2B.1 --apply
        ↓
  ponovni --dry-run = 0 kandidata
        ↓
RELEASE B kandidat
  2B.2 resolver + 2B.3 content contract + 2B.4 CMS tri-state
```

Ovaj redosled ostaje production release gate. Dok okruženje radi staru šemu sa `default: false`,
Mongoose ponovo materijalizuje `enabled: false` pri prvom sledećem snimanju —
pa bi `--apply` pre deploy-a bio praktično beskoristan:

```text
stara production šema (default: false)
        ↓
$unset migracija
        ↓
sledeći save
        ↓
Mongoose ponovo materijalizuje false
```

Staging rehearsal je završen; produkcijsko izvršavanje nije deo ovog cleanup taska.

### 2B.1 — legacy implicit-false normalizacija ✅

**Zašto pre resolvera.** Uklanjanje `default: false` iz šeme **ne briše** već
upisane vrednosti iz Mongo-a. Svaki `SalonProfile` sačuvan dok je default
postojao i dalje fizički nosi:

```json
{ "audiencePaths": { "enabled": false, "paths": [] } }
```

Čim resolver počne da poštuje `false` kao apsolutni veto, taj **implicitni**
false postaje nerazlučiv od stvarne odluke vlasnice. To je tačno problem koji
2B.0 postoji da eliminiše — pa resolver ne sme pre normalizacije.

**Migracija je konzervativna klasifikacija, ne masovni `$unset`.**

Izveštaj po redu: `tenant · theme · section · enabled · meaningfulContent · decision`

| stanje | odluka |
|---|---|
| `enabled === false` **i** nema meaningful autorskog sadržaja | kandidat za `$unset` |
| `enabled === false` **i** postoji meaningful sadržaj | **NE DIRAJ** → report / ručni pregled |
| `enabled === true` | **NE DIRAJ** |
| `enabled` odsutno | **NE DIRAJ** |

Obavezno: `--dry-run` i `--apply` kao odvojeni režimi, plus test idempotencije
(drugo pokretanje ne sme promeniti nijedan dokument).

Alat i idempotency ugovor su završeni; staging rehearsal je potvrdio redosled.
Kasnije se ne pretpostavlja da `false` nije stvarna korisnička odluka.

### 2B.2 — resolver je zaseban sloj, ne loader

`definitions.ts` **ne sme** da sazna za `enabled`. Header tog fajla to već
izričito kaže, a svih sedam theme-9 loadera vraća samo `{ content }`. Da loader
počne da odlučuje vidljivost, generički Feature Block loader bi primio theme-9
presentation policy.

```text
definitions.load()          ← samo domenski/persistence podaci
        │ raw authored data
        ▼
theme-9 presentation resolver
        ├── enabled=false               → hidden
        ├── meaningful persisted content → authored
        └── empty                        → hidden
        ▼
mapper → komponenta
```

### Ne generalizovati svih 10 blokova

2B resolver **ne sme** da tretira svaki `landing.*.enabled` jednako — inače
theme-9 popravka menja ponašanje tema 1–8.

| grupa | ugovor |
|---|---|
| 7 theme-9 autorskih blokova | novi tri-state visibility ugovor |
| `about` | postojeći safe tenant-derived fallback (loader već dovlači `salon.name`, `salon.logo`, `tenantStats()`) |
| `blog` / `LatestEducation` | zaseban runtime-data policy; `enabled` i dalje ima `default: false` kao shared legacy sekcija |
| `hero` | postojeći theme-9 mapper/fallback ugovor |

### 2B.3 — content contract 7/7 ✅

Tri koncepta su odvojena:

- **authoring guidance** postoji samo u CMS-u i nikada nije tenant content/SEO;
- **starter/demo content** je pravi persisted sadržaj koji provisioning dopunjava
  samo kada blok nedostaje ili je prazan;
- **runtime presentation** renderuje persisted sadržaj bez veta, a prazno skriva.

Neutralni javni payload ne postoji. Pun demo izgled dolazi iz persisted starter
sadržaja, ne iz runtime copy-ja.

### 2B.4 — CMS tri-state ✅

Odsutan blok prikazuje „Podrazumevano”, editor ostaje dostupan i otvaranje CMS-a
ne materijalizuje `enabled: true`. OFF može biti prazan; DEFAULT/ON traži
minimalni renderable sadržaj i vodi korisnicu do prve greške.

### 2C — content-aware page/navigation resolver

Zatečeni Header theme-9 je mogao voditi na 404 i hardkodovao je `/blogs`, dok
[MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md](MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md)
predviđa da ta stavka vodi na `/edukacija`. 2C je zato implementiran kao
content-aware resolver umesto hardkodovanog linka.

**Granica: 2C ne sme prosto zameniti `/blogs` sa `/edukacija`** dok ta ruta i
capability nisu stvarno dostupni. Traži se kompatibilan resolver:

```text
Education Center dostupan
+ education.catalog resolved
+ ruta/stranica spremna
        → Edukacija vodi na /edukacija

inače, ako tenant legitimno koristi postojeći education/blog sadržaj
        → Edukacija vodi na /blogs

inače
        → link se ne prikazuje
```

Tako 2C ne mora da se piše ponovo kada Edu Studio stigne.

### Planirani Education rad — namerno van tabele

**Kanonski arhitektonski dokument luka:**
[PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md) — zaključana workspace
arhitektura (verticals, ne `tenantType`), Content Composer izdvajanje, Education
domen, Client Workspace, Guide i program, u 11 faza. **Faza 0 počinje posle
Theme-9 contract/rollout foundation-a, kada staging postane aktivna razvojna
linija Edu luka.**

Tri prateća dokumenta nose product/domenski ulaz i **nisu** raspoređena u slice-ove:

- [EDUCATION_CAPABILITY_GATE_AND_ADOPTION.md](EDUCATION_CAPABILITY_GATE_AND_ADOPTION.md) — `education.catalog` capability gate, Salon → Salon + Edu adopcija
- [MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md](MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md) — javne rute `/edukacija`, Edu Studio
- [SKINCARE_EDUCATION_DOMAIN_PRODUCT_PARTNERSHIP.md](SKINCARE_EDUCATION_DOMAIN_PRODUCT_PARTNERSHIP.md) — domenski input Marine B. Stanisavljević

Dodaju se u tabelu tek kad postanu aktivan implementacioni posao. Jedina tačka
gde već sada obavezuju tekući rad je 2C (vidi gore).

**Ne formulisati kao „samo palimo prekidač".** `education.catalog` i
`education.inquiries` jesu registrovani u `lib/platform/capabilities.ts`, ali
resolver traži tri uslova odjednom:

```text
enabled = platformAvailable && planEntitled && tenantEnabled
```

Danas su za `education.catalog` sva tri nepovoljna: `platformAvailable: false`,
`plan: UNMAPPED` (a `resolveCapabilityPlanEntitlement()` za `unmapped`
bezuslovno vraća `false`) i `legacyBeautyDefault: false`. Samo
`platformAvailable: true` ne bi promenilo ništa — `true ∩ false ∩ true = false`.

Tačna formulacija: **infrastruktura i capability ID već postoje**; kada
Education postane aktivan proizvod, potrebno je otvoriti platform availability,
definisati entitlement model i uključiti capability odgovarajućim tenantima.
To je i dalje dobra vest — triple-gate iz 0C se koristi kakav jeste i ne pravi
se nov sistem dozvola.

## Demo/starter naspram odobrenog live sadržaja

Demo/prospect tenant sme imati ilustrativne tretmane, cene, testimonials, tim,
edukacije, CTA i medije da bi pokazao pun dizajn teme. To je persisted starter
sadržaj i provisioning odgovornost. Nije automatski factual-approved live copy.

Tenant-reviewed live sadržaj nosi zasebnu odgovornost za tačnost i SEO/indexing.
Ovaj cleanup ne uvodi tenant lifecycle niti menja SEO engine; samo zaključava da
demo provisioning i live odobrenje nisu ista odluka.


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
| ~~7 theme-9 landing sekcija nema urednička polja~~ ✅ | `Theme9Sections.tsx` + `primitives.tsx` | **2A.2 zatvoren na `main`-u** — editor postoji za svih 7, uz coverage i minimum-content testove. |
| `themePages` i dalje nema urednička polja — sadržaj se autoriše kroz `npm run seed:theme9 -- --tenant=<slug>` | `AdminLandingCMS.tsx` | otvoreno; polja postoje u bazi, ali editor ih ne prikazuje |
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

`initialOfferingId` **inicijalizuje stanje toka**, ne beleži ništa — ni booking,
ni hold, ni rezervaciju; zato se korak 01 ne prikazuje. Stvarni zapis nastaje
kroz authoritative write tok Booking Engine-a, mnogo kasnije.

Isti ugovor pokriva i preferencu iz theme-9 `finalCta` (`preferredDate` /
`preferredStartTime`), uz jednu asimetriju: ponuda sme da preskoči korak 01,
preferirani termin NE sme da preskoči korak 02 jer mu validnost zavisi od
trajanja ponude. Puna matrica ulaza je u
[PANTA-THEME9-FINAL-CTA.md](PANTA-THEME9-FINAL-CTA.md) §4.2.

**Terminologija je već očišćena:** prikaz koristi `offerings` / `offeringId` /
`offeringTitle` / `pickOffering()`, ne `service*`. Privremeni prikaz ne sme kroz
mala vrata vratiti jednačinu `Consultation = Service`, koju Slice 7 postoji da
razdvoji.
