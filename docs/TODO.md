# TODO — gde smo stali

> Tracker za tekući luk rada: **T3 Booking Engine + Consultation domen + theme-9 „Skincare Marina"**.
> Jedan red po slice-u. Detalji su u dokumentu koji je naveden uz slice — ovde stoji samo status i jedna rečenica.
> Poslednja izmena: 2026-09-02 · `staging/production-engines` · **Edu Centar v1 pilot** + **Beauty Booking/CRM luk u toku**
>
> **Aktuelno stanje:** correctness fixes, Theme-9 **2A, ceo 2B i 2C** i
> migration/staging tooling nalaze se na `main`-u. Staging Release A + migration
> rehearsal je završen nad staging DB-om. Content contract cleanup zatvara
> runtime/CMS/starter granice; nema neutralnog javnog fallback sadržaja.
>
> **Zašto je T3 preskočen (odluka 2026-08-29):** prioritet je bio da se tvrdnje
> o radu na backendu odmah vide kao **stvaran, klijentu vidljiv test u
> frontendu** — prelazak Salon → Edu Centar, izgled i UX. Zato su T3 cutover i
> Consultation / Questionnaire / Care privremeno preskočeni. **To nisu otkazani
> poslovi:** `day-lock` nam **jeste neophodan**, kao i Consultation,
> Questionnaire, Education i Care domen. Day-lock ostaje tvrdi preduslov pre
> nego što Marina primi ijednu stvarnu rezervaciju.
>
> ```text
> 2A            ✅ razvoj
> 2B            ✅ razvoj
> 2C            ✅ razvoj
> Release A     ✅ staging rehearsal
> content cleanup ✅
> Edu F0         ✅ staging
> Edu F1         ✅ staging
> Edu F2         ✅ staging
> Edu UI-1A/F3A  🟡 selector + activation code complete · Marina browser acceptance pending
> Edu UI-2/F4A+F3B ✅ kod · Marina CMS browser test pending
> Edu UI-2B      ✅ working copy + published snapshot
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
| Edu F1 | Content Composer | ✅ staging | Generički editor/render/schema/registry/score/SEO sloj je izdvojen, newsletter je ostao tanak adapter, a oba renderera koriste jedan `BlockList`. Karakterizacioni testovi čuvaju postojeći Newsletter contract. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-1--content-composer-deljeni-sloj) |
| Edu F2 | Authoring + blocks + persistence | ✅ staging | F2A authoring UX, F2B šest novih blokova i shared media contract, F2C draft-save/strict-publish validation i structural edge audit su završeni. Newsletter/Blog lifecycle i preostali write-authority edge su zaključani. | [PANTA-NEWSLETTER-BLOG-AUTHORING.md](PANTA-NEWSLETTER-BLOG-AUTHORING.md) |
| EDU UI-1A / F3A | Capability-aware Admin Education workspace | 🟡 code complete · Marina browser acceptance pending | Snapshot projektuje server-resolved verticals; jedan dropdown prikazuje aktivni workspace. Beauty tenant dobija eksplicitni, potvrđeni i idempotentni „Aktiviraj Edu Centar” tok koji isti tenant pretvara u hybrid; Salon/Theme-9 ostaju netaknuti. Education/hybrid navigacija, server-gated `/education` i Content shell su spremni. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#f3a--admin-workspace-capability-i-navigacija-edu-ui-1) |
| EDU UI-2 / F4A + F3B | EducationContent + pravi CMS CRUD + Content Composer | ✅ kod · 🟡 Marina CMS browser test pending | `EducationContent` model, tenant-scoped CRUD + strict publish rute iza `requireCapability("education.catalog")`, CMS lista i full-page editor nad deljenim Content Composer-om (svih 12 blokova, shared media, preview). Save Draft ne menja status; publish čita sačuvano stanje. Javno `/edukacija`, assignment i ACL nisu dirani. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#implementacioni-status-f4a--f3b-edu-ui-2--2026-08-29) |
| EDU UI-2B | Durable working copy + last-published snapshot | ✅ kod | Zatvoren propust iz UI-2: `status` je ostajao `published`, ali je Save menjao baš root polja koja bi javna strana čitala, pa je snimanje bilo implicitna objava. Sada root = radna kopija, `publishedSnapshot` = javna verzija, objava = jedina granica promocije. Javni URL, vidljivost i SEO takođe žive u snapshot-u. Bez istorije verzija. 13 lifecycle testova nad pravim Mongo-om. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#implementacioni-status-f4a--f3b-edu-ui-2--2026-08-29) |
| DOC-EDU-ACCESS-1 | PUBLIC / GATED / PRIVATE ugovor pristupa | ✅ dokumentacija (bez koda) | Tri režima pristupa umesto dva, javni pregled za `gated`, 404 za `private`, entitlement odvojen od režima pristupa, ponašanje adresa i liste, bezbednost tokena i zaštićene media. Kod nije menjan — persistencija je i dalje `visibility: public\|private`; migracija na `accessMode` je UI-3A. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#pristup-sadržaju--public--gated--private-zaključano-2026-08-29) |
| EDU UI-3A/3B | Javna Education prezentacija | ✅ kod | `/edukacija` lista i članak u Theme-9, semantički HTML ugovor, istorija javnih adresa sa preusmerenjem, SEO i sitemap po članku. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-5--javno-edukacija--release-gate) |
| EDU F6A/F6B | Moj Prostor + dodela i ACL | ✅ kod | `ClientContentAssignment` kao zaseban odnos; zaštićeno telo služi samo `/panel/moj-prostor/sadrzaji/{id}`, i to uz sva četiri uslova. Javna ruta nikada ne služi zaštićeno telo. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-6b--dodela-sadržaja-i-acl) |
| EDU F | PDF/DOCX → draft | ✅ kod | DOCX se čita verno, PDF heuristikom; rezultat je uvek draft za pregled, nikada objava. Acceptance nad Marinina četiri prava materijala. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#edu-centar-v1--feature-freeze-2026-08-31) |
| **Edu Centar v1** | **Feature freeze · Marina pilot** | 🟡 **pilot u toku** | Nove funkcije čekaju signal iz stvarne upotrebe. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#edu-centar-v1--feature-freeze-2026-08-31) |

### Beauty Booking / CRM luk — aktivno

> Tracker: [PANTA-BOOKING-CRM-ARC.md](PANTA-BOOKING-CRM-ARC.md) · staging
> tenant **theme-1 / Marysoll**. Ništa iz ovog luka nije prošlo kroz pregledač.

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| B-P0 | Semantika cene: `0` ≠ `null` | ✅ kod | Tri režima: `fixed` tačan, `from` minimum, `on_request` bez ukupne cene. Nepoznata osnovna cena truje ceo zbir — „na upit + stiker 700" više nije „od 700 RSD". | [PANTA-BOOKING-PRICING.md](PANTA-BOOKING-PRICING.md) |
| B-P1 | Opaque `ref` u javnom ugovoru | ✅ kod | Varijante, dodaci i stavke paketa nose `ref` uz `name`; `_id` se ne izlaže. Aditivno. Ovo je bila mehanička prepreka zbog koje se engine nije mogao priključiti. | [PANTA-BOOKING-PRICING.md](PANTA-BOOKING-PRICING.md#6-server-je-autoritet) |
| B-2A | Server authority | ✅ kod | `resolveBookingRequest` — tenant-scoped Service → canonical selekcija/trajanje/cena → availability. `resolveServiceBookingProduct` prvi put izlazi iz testova. Priključeno na `create` i javnu gost rutu. | [PANTA-BOOKING-PRICING.md](PANTA-BOOKING-PRICING.md#6-server-je-autoritet) |
| B-2B | `Appointment.pricing` snapshot | ✅ kod | Server-generated. `chargedAmount` je NOVO polje — `finalPrice` je vaučerska aritmetika i ostaje netaknut. Vaučer čeka numeričku osnovicu. Tri analitička accessora; realizacija traži `completed`. | [PANTA-BOOKING-PRICING.md](PANTA-BOOKING-PRICING.md#3-četiri-različite-činjenice) |
| B-1A/1B | Rok, faze i klijentske akcije | ✅ kod | Rok = početak termina − prozor, u zoni salona (ranije `createdAt + N`). Četiri faze uz fail-safe `unknown`. Promeni/Otkaži na kartici u „Moji termini". Grace 30 min kao sistemsko pravilo. | [PANTA-CANCELLATION-NOSHOW-POLICY.md](PANTA-CANCELLATION-NOSHOW-POLICY.md) |
| B-OCC | Occupancy | ✅ kod | `no_show` je na sedam mesta i dalje držao vreme — kasno otkazan termin salon nije mogao da proda. Jedno pravilo, dva izvedena oblika. | [T3 §8.1a](PANTA-T3-BOOKING-ENGINE.md) |
| B-INT | Zahtev za uslugu (intake) v1 | ✅ kod | `Appointment.request`, `requiresIntake` na KATEGORIJI, tenant-scoped Cloudinary upload sa sanitizacijom, badge i detalj u adminu, mejl kao signal. | [PANTA-SERVICE-INTAKE.md](PANTA-SERVICE-INTAKE.md) |
| B-PRICE-IN | Unos cene i statistika | ✅ kod | Salon unosi cenu pri Odobri i Došla, oba opciona. Mejl više ne predstavlja cenu dodatka kao cenu termina. „Termini bez cene" i „Cena nije definisana" umesto tihe nule. | [PANTA-BOOKING-CRM-ARC.md §4](PANTA-BOOKING-CRM-ARC.md) |
| B-SEC | ★ Izolacija klijenta | ✅ kod · **staging provera obavezna** | `/api/appointments` je klijentu vraćao PUNE termine celog salona — imena, telefoni, poruke, intake fotografije, cene. Filter sada dolazi iz tokena. | [PANTA-BOOKING-CRM-ARC.md §5](PANTA-BOOKING-CRM-ARC.md) |
| B-2C-1 | Client reschedule → canonical | ⬜ nije počet | `Service.findById` bez tenant scope-a; trajanje još iz browsera; `late_cancel` se upisuje zbog NEUSPELE izmene. | [PANTA-BOOKING-CRM-ARC.md §7](PANTA-BOOKING-CRM-ARC.md) |
| B-2C-2 | Proposal lifecycle | ⬜ nije počet | Prihvatanje predloga radi `date = proposedDate` bez provere dostupnosti → tihi double booking. Klijent nema Odobri/Odbij. | [PANTA-BOOKING-CRM-ARC.md §7](PANTA-BOOKING-CRM-ARC.md) |
| B-2C-3 | ★ Admin create/edit, HMAC, marketplace | ⬜ nije počet | **Admin edit nema nikakvu proveru dostupnosti** — jedini put koji može pregaziti tuđi termin. Cenu računa u React komponenti. | [PANTA-BOOKING-CRM-ARC.md §7](PANTA-BOOKING-CRM-ARC.md) |
| B-2C-4 | Vaučer recompute | ⬜ nije počet | Polja za unos postoje; ostaje obračun kad quote postane numerički. | [PANTA-BOOKING-PRICING.md §4](PANTA-BOOKING-PRICING.md) |
| B-DEBT | `extras` se odbacuju pri upisu | ⚠️ nedokazano | `IAppointmentService` ima `variants?`/`extras?`, Mongoose `servicesSchema` nema nijedno. Dokazati integracionim testom pre menjanja modela. | [PANTA-BOOKING-CRM-ARC.md §7](PANTA-BOOKING-CRM-ARC.md) |
| B-360 | Klijent 360° | ⬜ odloženo | Istorija termina po klijentu, isti detalj zahteva. Podaci već postoje. | [PANTA-BOOKING-CRM-ARC.md §8](PANTA-BOOKING-CRM-ARC.md) |
| B-INT2 | Intake v2 | ⬜ odloženo | Per-service `inherit\|enabled\|disabled`, wizard, intake na SVIM ulazima za rezervaciju. | [PANTA-SERVICE-INTAKE.md §7](PANTA-SERVICE-INTAKE.md) |
| B-THEMES | Brisanje theme-3/4/6 | ⬜ odloženo | ~7.300 linija, 66 fajlova; baza potvrđena prazna. Preduslov: `Theme3GalleryMasonry` u `shared/`. | [PANTA-BOOKING-CRM-ARC.md §8](PANTA-BOOKING-CRM-ARC.md) |

| B-T1-0 | ★ Stop-the-line hardening | ✅ kod | Cena nije stizala u bazu; `/api/statistics` i `/api/generate-image` bili otvoreni; Theme-1 prikazivao sadržaj drugog tenanta; tooltip tvrdio 0 RSD. Dve stavke vraćene kao odluka, ne popravka. | [PANTA-BOOKING-CRM-ARC.md §11](PANTA-BOOKING-CRM-ARC.md) |

| B-T1-0.5 | ★ Service-owned Intake | ✅ kod · ✅ migracija | Odluka o zahtevu preseljena sa platformske kategorije na uslugu; jedan checkbox u obrascu. Server odbija zahtev na usluzi koja ga ne prima. `CATEGORY_MAP.requiresIntake` više nije authority. Backfill pokrenut 2026-09-02 (4 usluge, 2 salona); verifikacioni dry-run = 0. | [PANTA-SERVICE-INTAKE.md](PANTA-SERVICE-INTAKE.md) |
| B-T1-1 | ★ Canonical booking/edit/reschedule lifecycle | ✅ kod · **staging provera obavezna** | Izbor usluge se do sada tiho odbacivao pri upisu (dokazano testom). Klijentska izmena je tražila uslugu bez tenant scope-a i verovala `duration` iz browsera; admin izmena nije imala nijednu proveru zauzeća; prihvatanje predloga nije proveravalo dostupnost, a predlog se nikad nije brisao; klijent je mogao sam sebi da odobri termin. | [PANTA-BOOKING-CRM-ARC.md §14](PANTA-BOOKING-CRM-ARC.md) |
| B-THEME1 | Theme-1 privatna za Marysoll | ✅ kod | Kroz postojeći `THEME_ACCESS` seam, isti kao za theme-8/9. Bez `if (tenantSlug)` u komponentama. Provereno da nijedan drugi tenant nije na theme-1. | [PANTA-BOOKING-CRM-ARC.md §12](PANTA-BOOKING-CRM-ARC.md) |
| B-AI | AI generisanje slika | ✅ isključeno · odluka | Više se ne nudi javno; endpoint je admin + plan gated, admin CMS radi dalje. Uključuje se kroz plan ako salon zatraži — bez izmene koda. | [PANTA-AI-IMAGE-GENERATION.md](PANTA-AI-IMAGE-GENERATION.md) |

**Pet odluka doneto 2026-09-02** — grace 30 min ostaje sistemski, vaučer na
`on_request` čeka quote, admin predlog dobija Prihvati/Odbij, Marijino
„Izlivanje" na `variant + from`, i AI generisanje slika ostaje isključeno dok
se ne zatraži.
**Product princip:** Marysoll bira dobar default; opcija se uvodi tek kad
stvarna upotreba pokaže da saloni imaju različite potrebe, a događaji se beleže
dovoljno precizno da politika može kasnije da se promeni bez gubitka istorije.

**Odlučeno 2026-09-02** — blog ostaje u navigaciji; `late_cancel` i pravi
nedolazak imaju istu posledicu uz sačuvan razlog. Ostaje samo **odložena
arhitektura i semantika** — grace period kao tenant podešavanje,
razlika kazne `late_cancel` vs `missed_appointment`, `chargedAmount` na
otkazanom, vaučer na `on_request`, značenje `appointment_rescheduled`,
konvergencija quote snapshot-a i Marijina konfiguracija „Izlivanja":
[PANTA-BOOKING-CRM-ARC.md §9](PANTA-BOOKING-CRM-ARC.md).

### Booking / Consultation — zadržano

Novi Edu luk **ništa od ovoga ne zamenjuje** i izričito ne dira Booking Engine.

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| 4 | Booking UI apstrakcija | 🟡 prikaz gotov | `useBookingFlow` + theme-9 dijalog, **offering-first**: ponuda → datum i vreme → upitnik → pregled → potvrda (redosled nije kozmetika — vidi ugovor `initialOfferingId` niže). Launcher kroz kontekst, terminologija `offering*`, ne `service*`. **Bez ijednog upisa** — slanje samo šalje mejl vlasnici i superadminu, da potvrdi usluge, cene, termine i pitanja. Ostaje: `bookingProductAdapter` i `BookingThemeTokens` za ostale teme. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#33-readavailability-potrošači-nisu-write-authority) + T2 §6.10/6.11 |
| 6 | ★ Migracija + concurrency gate | ⏸ preskočeno zbog frontend dokaza · **day-lock neophodan** | **Preskočeno, ne otkazano:** prednost je dobio vidljiv frontend test za klijente (Salon → Edu prelaz, izgled i UX) umesto nevidljivog write cutover-a. Kanonska rezervacija, **day-lock**, idempotencija i outbox postoje u `src/lib/booking/` i prolaze ReplSet testove. **Ažurirano 2026-09-01:** `resolveServiceBookingProduct` je izašao iz testova — `/api/appointments/create` i javna gost ruta dobijaju canonical selekciju, trajanje i cenu kroz `resolveBookingRequest`. `BookingReservation`/`reserve()` i dalje niko ne poziva. Day-lock je **neophodan** i ostaje hard gate pre Slice 10. **Završeno:** Slice 5 dark core, 6A transition hardening i empirijski gate-ovi (T3 §21.2.4). **Odloženo:** production `Appointment` write migracija i Booking cutover nastavljaju se posle Marysoll platform/marketplace upgrade-a. Trenutno nema aktivnih Booking korisnika, pa nema poslovnog razloga za promenu production write authority-ja. Nijedna od 12 ruta se ne dira; Slot endpoint-i se ne gase samo radi arhitektonske čistoće. `BookingReservation` ostaje dark-core infrastruktura, ne production authority. Pripremljen obim za nastavak: 8 platformskih ulaza (T3 §21.2.6); empiriju iz §21.2.4 pre nastavka premeriti. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#213-slice-6b6c--planski-odloženo-2026-08-23) |
| 7 | Consultation domen | ⏸ preskočen · neophodan | `ConsultationOffering` → `ConsultationBooking` → `BookingReservation`. Marinin glavni proizvod; **nije `Service`**. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#142-consultation-i-education-granica) |
| 8 | Hold | ⬜ nije počet | `BookingHold` kroz istu day-lock transakciju; konkretan TTL ostaje product odluka Slice 8. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#20-bookinghold-i-slot-transition) |
| 9 | Questionnaire + Intake | ⏸ preskočen · neophodan | Guest-first booking ostaje moguć; generički intake čuva immutable početni snapshot, odvaja stručni Current Assessment od originalnog odgovora i kasnije podržava eksplicitni claim/invite identity handoff. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md#4-product-decision--consultation--skin-care-kutak-lifecycle) |
| 10 | ★ theme-9 booking end-to-end | ⬜ nije počet | Hero CTA → widget → modal → intake → preview → hold → atomic booking. **Marina sme primati konsultacije tek odavde.** | PANTA-T3-BOOKING-ENGINE.md |

### Education → zaseban dokument

Stari red „11 Education domen" **više ne postoji kao jedan slice**. Zamenjen je
kanonskim dokumentom [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md):

```text
F0   vertical / workspace foundation      F5   /edukacija → RELEASE GATE
F1   Content Composer                     F6A  Client Workspace + Moj Prostor
F2   novi blokovi + rupe u editoru        F6B  assignment + ACL
F3A  Admin workspace capability/UI        F7   transakciono obaveštenje
F3B  Content/API gates uz UI-2
F4   EducationContent + Edu Studio        F8   SkincareGuide
F4B  EducationOffering + EducationInquiry F9   GuidedProgram
                                          F10  AI asistencija
```

`EducationOffering` i `EducationInquiry` iz starog Slice 11 nisu izgubljeni —
žive u **Fazi 4B**.

✅ **Faze 0, 1 i 2 su završene na aktivnoj staging razvojnoj liniji.**
✅ **F4A + F3B (EDU UI-2) su u kodu:** `EducationContent` je drugi pravi host
deljenog Content Composer-a; `NewsletterCampaign` se ne koristi kao storage.

**NEXT: Edu Centar v1 je u FEATURE FREEZE-u — Marina pilot.**

Importer je bio poslednji rez pre pilota. Jezgro je dovoljno kompletno da
sledeći razvoj vodi stvarna upotreba, a ne pretpostavka. Do kraja pilota se
**ne dodaju nove funkcije i ne dira se domenski model**; menja se samo ono što
pilot pokaže kao stvarnu prepreku.

Pilot checklist za Marinu (bez tehničkih detalja):

```text
1. napravi jedan nov članak ručno
2. napravi jedan sadržaj iz PDF/DOCX
3. promeni nešto posle objave i ponovo objavi
4. napravi jedan zaključan sadržaj
5. probaj slike iz galerije i upload
6. pogledaj Mobile i Desktop pregled
7. zapiši svaki trenutak gde nije jasno šta sledeće da klikneš
```

Sedma stavka nosi najveću vrednost — više od još dvadeset funkcija.

Obim v1, ono što svesno nedostaje i poznata ograničenja koja treba razlikovati
od grešaka stoje u
[Edu Centar v1 — feature freeze](PANTA-EDU-CENTAR-ARC.md#edu-centar-v1--feature-freeze-2026-08-31).

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
| **Generic Care Domain** ⏸ preskočen · neophodan | stari Slice 13, preimenovan | `CareJourney` / `CarePlan` / `CareDocument` / `ProgressMedia`. Prvo vidimo šta `SkincareGuide` + `GuidedProgram` + follow-up stvarno traže, pa tek onda generalizujemo — sigurnije od apstrakcije unapred |
| **Jedan `AuthUser` → više `Tenant`-a** | Edu plan, Faza 0 | Jedini ispravan put za potpuno odvojene Salon/Education biznise istog vlasnika. „Neka napravi drugi nalog" ne radi: `AuthUser.email` je globalno unique, register vraća 409 |
| **DIAG-EDU-1** — Education integrity provere | posle Marina pilota | Registry pokriva Identity, Loyalty, Appointment, ownership, SEO i push; Education nema nijednu. Tri najvrednije provere mere granice pristupa nad **stvarnim** podacima, a ne nad izmišljenim iz testova |
| **DIAG-SUPPORT-1** — „Pošaljite problem podršci" | posle Marina pilota | Snapshot iz postojećeg Diagnostic Engine-a + kontekst aplikacije → **sačuvan incident**, pa tek onda obaveštenje/mejl/push. Ako slanje zakaže, report ostaje. Privacy granica: metapodaci da, sadržaj korisnika ne |
| **Read-model cleanup** | dug iz H0 | Write loss je zatvoren; višestruke ručne read projekcije `SalonProfile` ostaju |

Legenda: ⬜ nije počet · 🟡 u toku · ✅ gotovo · ⛔ blokiran · ⏸ preskočeno/odloženo (posao ostaje neophodan)

## Ispravke zatečenih nalaza

Nalazi koje je [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#rizici-i-zatečeni-problemi)
vodio kao „zatečeno“, a koji su u međuvremenu **stvarno zatvoreni u kodu**:

| Nalaz | Stvarno stanje |
|---|---|
| `getCampaign.ts` ne filtrira `landingPage.status === "published"` — neobjavljena kampanja bila je dostupna na svom URL-u ako znaš slug (ARC, red u tabeli rizika) | ✅ **ZATVORENO 2026-08-29.** Više ne stoji „zabeležiti, ne popravljati“ — ispravka je bila trivijalna. `getCampaign()` sada koristi `publishedBlogFilter()` koji traži `landingPage.enabled: true` **i** `landingPage.status: "published"`, pa neobjavljena kampanja vraća „Campaign not found“. Kod: `src/lib/server/getCampaign.ts`, `src/lib/tenant/blogPosts.ts` |

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
- **Tenant → Workspace → Presentation je zaključano platformsko pravilo.**
  Salon + Edu nije novi tenant nego jedan tenant sa dva workspace-a; novi tenant
  je novi brend, domen ili odvojen biznis. Admin workspace sme postojati pre
  javne prezentacije tog vertikala. Vidi
  [ARCHITECTURAL_RULES.md §3.3](ARCHITECTURAL_RULES.md#33-tenant--workspace--presentation-zaključano-2026-08-29).
- **`published` nije javno.** `status` je lifecycle, `visibility` je ko sme da
  konzumira. Svaki budući javni upit nad `EducationContent` mora tražiti
  `tenantId` + `status=published` + `visibility=public`; samo status nije dovoljan.
- **Education ima dve kopije, bez istorije verzija.** Root polja su radna
  kopija, `publishedSnapshot` je javna verzija, a objava je jedina granica
  promocije. Save ne sme ni da obori objavljen sadržaj u draft (newsletter
  obrazac) ni da ga tiho izmeni uživo (suprotan propust, zatvoren u UI-2B).
- **Javni izvor istine je `publishedSnapshot`.** UI-3 čita snapshot, nikada
  `root.status` + `root.visibility` + `root.blocks`. Zapis bez snapshot-a nije
  javan ni kad je `status: "published"` — fail-closed.
- **Education sadržaj ima tri režima pristupa: `public` / `gated` / `private`.**
  `gated` je javno otkriven a telo zaključano; `private` nije otkriven i
  neautorizovan URL vraća **404**, nikad „nemate pristup". Pretplata, kupovina i
  ručno odobrenje nisu četvrto stanje nego izvori prava pristupa (entitlement),
  i ne kodiraju se u režim pristupa. Semantika je zaključana, **persistencija je
  i dalje dvočlana** — migracija na `accessMode` pripada UI-3. Ugovor:
  [PANTA-EDU-CENTAR-ARC.md § Pristup sadržaju](PANTA-EDU-CENTAR-ARC.md#pristup-sadržaju--public--gated--private-zaključano-2026-08-29).
- **Tema nikada nije autoritet pristupa.** Neautorizovan odgovor ne sme sadržati
  zaštićeno telo — ni u HTML-u, ni u RSC payload-u, ni u JSON-u.
- **`/edukacija` lista je javna i nepersonalizovana.** Ista je za svakog
  posetioca: javne + `gated` pregled. `private` se u njoj ne pojavljuje ni
  prijavljenoj klijentkinji koja ima pristup — privatan sadržaj živi u
  `Moj Prostor` → `Moji sadržaji`. Entitlement se razrešava na detaljnoj ruti, ne
  u listi, pa lista ostaje keširana i bez per-viewer grana.
- **Čuvanje nije pristup.** Dugme „+ dodaj u Moj prostor" pravi samo referencu u
  klijentkinjinom prostoru; sačuvan `gated` sadržaj ostaje zaključan sa istim
  CTA. Dodela sme biti izvor odobrenja, čuvanje nikada. Sačuvan sadržaj koji je
  zaključan ili sklonjen ostaje kao prazna kartica „više nije dostupno" sa
  akcijom (zatraži pristup / ukloni), sa naslovom koji je klijentkinja sačuvala
  — nikad novim privatnim naslovom.
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
`education.inquiries` jesu registrovani u `lib/platform/capabilities.ts`, a
resolver traži tri uslova odjednom:

```text
enabled = platformAvailable && planEntitled && tenantEnabled
```

EDU UI-1 otvara samo `education.catalog`: `platformAvailable: true`, postojeći
plan source `core`, uz obavezni explicit tenant provisioning i Education
vertical. Beauty zato ostaje isključen. Ovo je najmanji workspace/content
foundation contract, ne skrivena pricing odluka; poseban Education entitlement
još ne postoji u plan modelu. `education.inquiries` i `booking.education` ostaju
platform-unavailable/unmapped dok njihove stvarne površine ne postoje.

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
