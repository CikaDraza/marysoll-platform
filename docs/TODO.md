# TODO — gde smo stali

> **Jedini operativni tracker.** Ovde se vidi redosled: šta je u kodu, šta je
> sledeće i šta je namerno odloženo. Detalji po domenu žive u canonical
> dokumentima i ne prepisuju se ovde.
>
> Stanje koda provereno **2026-09-04**; Edu pilot closure redosled revidiran
> **2026-09-04**.
> Zdravlje tog preseka: `tsc` prolazi, lint bez novih upozorenja, build prolazi,
> 178 test fajlova / 2068 testova prolazi (19 preskočeno). Brojevi važe za taj
> datum i nisu obećanje.

## Redosled

```text
EDUCATION    🟡  Edu pilot closure → E1 ✅ → E2 ✅ code → E3 → E4 → E5
BEAUTY       ✅  T1-0 → T1-4 prihvaćeno
             🟡  Marysoll browser acceptance čeka za T1-1 → T1-3 rezove
NEXT         →   E3 Draft safety acceptance / hardening
DEFERRED     →   T1-5 · evidencija naplate (granica zaključana) · T3 cutover ·
                 legacy HMAC/marketplace write ·
                 Consultation / Questionnaire / Care · FUTURE H1–H4/F4–F7
```

Legenda: ⬜ nije počet · 🟡 u toku · ✅ gotovo · ⛔ blokiran · ⏸ odloženo (posao
ostaje neophodan)

## NEXT — sledeći rez

**E3 — Draft safety acceptance / hardening.** E2 authoring hierarchy je u kodu;
browser acceptance ostaje otvoren i ne računa se kao završen samo na osnovu
testova. E3 proverava postojeći autosave/recovery tok u realnom browseru, bez
automatskog uvlačenja T1-5, multi-workspace migracije, Content Coach-a ili
Marketing Center-a.

## T1-4 — Loyalty Redemption & Appointment Checkout

| # | Rez | Status | Šta je zaključano | Dokument |
|---|---|---|---|---|
| **T1-4** | **Loyalty Redemption & Appointment Checkout** | ✅ **prihvaćeno** | Trošenje poena kroz konfigurisanu points-shop nagradu → vaučer → primena na termin → `redeemed` na završenoj poseti. Klijentkinja bira pogodnost posle zakazivanja, salon je primenjuje u njeno ime; jedna pogodnost po terminu; atomsko skidanje poena; vaučer recompute kad quote postane numerički; Appointment Checkout kao račun. | [PANTA-LOYALTY-ENGINE.md §14](PANTA-LOYALTY-ENGINE.md) · [cene §4](PANTA-BOOKING-PRICING.md) |

Rezovi su isporučeni kao A–E:

```text
T1-4A  stabilan identitet points-shop ponude + atomsko trošenje poena
T1-4B  pogodnost prati cenu i uslugu + jedan računar popusta
T1-4C  Appointment Checkout — završetak termina kao račun
T1-4D  klijentski i admin izbor pogodnosti + points shop editor
T1-4E  dokumentacija + regresija
T1-4H  hardening: 4 concurrency/durability rupe (review nalaz)
T1-4F  zatvaranje completion-revert i checkout-benefit trka
```

**Hardening pass (T1-4H)** je zatvorio četiri ivice koje prvi prolaz testova
nije hvatao, bez promene arhitekture:

| # | rupa | zatvoreno |
|---|---|---|
| 1 | potvrđena pre-benefit cena bila je UI pravilo, ne server invariant | završetak sa pogodnošću bez potvrđene cene je `400`; auto-complete preskače |
| 2 | kupovina je koristila termin i ponudu učitane PRE transakcije | termin, konfiguracija i ponuda se ponovo čitaju u sesiji; status je deo upisa |
| 3 | oslobađanje vaučera išlo je posle commit-a i gutalo grešku | upis termina i `reserved → active` su ista transakcija |
| 4 | `loyaltyProcessed.completed` značilo je „počeli smo", ne „gotovo je" | zastavica tek posle vaučera i durabilnog događaja; ponovni checkout popravlja |

**T1-4F** je zatvorio dve preostale ivice oko istog prelaza:

| # | trka | zatvoreno |
|---|---|---|
| A | revert je zavisio SAMO od zastavice, pa završetak koji je ostavio trag pre nje nije bio kompenzovan; zastareo `appointment_completed` mogao je da nagradi vraćen termin | revert gleda dokaze (vaučer, durable događaj, zastavica), `revertCount` napreduje poslednji, `handleCompleted` fail-closed proverava ciklus termina |
| B | checkout je računao račun nad jednom pogodnošću, a upisivao `completed` bez provere da je to i dalje ta | upis nosi CAS na `appliedVoucherId`; neslaganje je 409 i traži svež pregled |

**Zaključane granice koje T1-4 NIJE prešao.** Srca se i dalje ne troše ručno
(nema heart shopa ni konverzije u dinare), nema kursa poen→RSD ni slobodnog
unosa, nema stackovanja pogodnosti, nema novog plan gate-a, nema payment
providera i nema refunda poena. Points-shop poeni se pri uklanjanju pogodnosti
ili otkazivanju **ne vraćaju** — vrednost je već kod klijentkinje, u vaučeru.

**Zatvoreno usput:** `chargedAmount` sada ima prednost nad `finalPrice` pri
knjiženju zarade (dogovoreno 3.200 / naplaćeno 3.000 → poeni na 3.000), a
service-scoped `fixed` vaučer više ne prolazi na uslugu van svog scope-a.

## Education i Theme-9 — u kodu

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| 2 | theme-9 prezentacija | ✅ 2A · 2B · 2C · content cleanup | Theme-9 foundation je na `main`-u: persistence, tri-state, konzervativna normalizacija, fail-closed presentation resolver, 7/7 CMS authoring + minimum validacija i content-aware page/navigation resolver. Staging Release A/migration rehearsal je završen. Starter seed je provisioning koji defaultno čuva tenant-authored sadržaj. Dalji razvoj/QA je staging-only. | [PANTA-T2-THEME-LAYOUT-ENGINE.md](PANTA-T2-THEME-LAYOUT-ENGINE.md) |
| Edu F0 | Vertical & workspace foundation | ✅ staging · CURRENT/legacy | Preset-aware onboarding i isti-tenant hybrid provisioning su implementirani kao prelazno stanje. **Nisu TARGET:** budući model je jedan `AuthUser` → odvojeni Salon/Edu tenant-i. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-0--vertical--workspace-foundation-currentlegacy-transition) |
| Edu F1 | Content Composer | ✅ staging | Generički editor/render/schema/registry/score/SEO sloj je izdvojen, newsletter je ostao tanak adapter, a oba renderera koriste jedan `BlockList`. Karakterizacioni testovi čuvaju postojeći Newsletter contract. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-1--content-composer-deljeni-sloj) |
| Edu F2 | Authoring + blocks + persistence | ✅ staging | F2A authoring UX, F2B šest novih blokova i shared media contract, F2C draft-save/strict-publish validation i structural edge audit su završeni. Newsletter/Blog lifecycle i preostali write-authority edge su zaključani. | [PANTA-NEWSLETTER-BLOG-AUTHORING.md](PANTA-NEWSLETTER-BLOG-AUTHORING.md) |
| EDU UI-1A / F3A | Capability-aware Admin Education workspace | ✅ code · CURRENT/legacy | Beauty tenant može aktivirati Edu u istom tenant-u; taj tok ostaje kompatibilnost za pilot, ne budući product model. Server-gated `/education` i Content shell su spremni. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#f3a--admin-workspace-capability-i-navigacija-edu-ui-1) |
| EDU UI-2 / F4A + F3B | EducationContent + pravi CMS CRUD + Content Composer | ✅ kod · 🟡 Marina CMS browser test pending | `EducationContent` model, tenant-scoped CRUD + strict publish rute iza `requireCapability("education.catalog")`, CMS lista i full-page editor nad deljenim Content Composer-om (svih 12 blokova, shared media, preview). Save Draft ne menja status; publish čita sačuvano stanje. Javno `/edukacija`, assignment i ACL nisu dirani. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#implementacioni-status-f4a--f3b-edu-ui-2--2026-08-29) |
| EDU UI-2B | Durable working copy + last-published snapshot | ✅ kod | Zatvoren propust iz UI-2: `status` je ostajao `published`, ali je Save menjao baš root polja koja bi javna strana čitala, pa je snimanje bilo implicitna objava. Sada root = radna kopija, `publishedSnapshot` = javna verzija, objava = jedina granica promocije. Javni URL, vidljivost i SEO takođe žive u snapshot-u. Bez istorije verzija. 13 lifecycle testova nad pravim Mongo-om. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#implementacioni-status-f4a--f3b-edu-ui-2--2026-08-29) |
| DOC-EDU-ACCESS-1 | PUBLIC / GATED / PRIVATE ugovor pristupa | ✅ dokumentacija (bez koda) | Tri režima pristupa umesto dva, javni pregled za `gated`, 404 za `private`, entitlement odvojen od režima pristupa, ponašanje adresa i liste, bezbednost tokena i zaštićene media. Kod nije menjan — persistencija je i dalje `visibility: public\|private`; migracija na `accessMode` je UI-3A. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#pristup-sadržaju--public--gated--private-zaključano-2026-08-29) |
| EDU UI-3A/3B | Javna Education prezentacija | ✅ kod | `/edukacija` lista i članak u Theme-9, semantički HTML ugovor, istorija javnih adresa sa preusmerenjem, SEO i sitemap po članku. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-5--javno-edukacija--release-gate) |
| EDU F6A/F6B | Moj Prostor + dodela i ACL | ✅ kod | `ClientContentAssignment` kao zaseban odnos; zaštićeno telo služi samo `/panel/moj-prostor/sadrzaji/{id}`, i to uz sva četiri uslova. Javna ruta nikada ne služi zaštićeno telo. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#faza-6b--dodela-sadržaja-i-acl) |
| EDU F | PDF/DOCX → draft | ✅ kod | DOCX se čita verno, PDF heuristikom; rezultat je uvek draft za pregled, nikada objava. Acceptance nad Marinina četiri prava materijala. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#edu-centar-v1--pilot-closure--revised-target-2026-09-04) |
| **Edu Centar v1** | **Pilot closure** | 🟡 **E1–E5 zaključani** | Feedback je pretvoren u mali završni rez; ne pravi se novi plan niti redizajnira UI koji radi. | [PANTA-EDU-CENTAR-ARC.md](PANTA-EDU-CENTAR-ARC.md#edu-centar-v1--pilot-closure--revised-target-2026-09-04) |

## Beauty Booking / CRM — u kodu

> Ugovor luka: [PANTA-BOOKING-CRM-ARC.md](PANTA-BOOKING-CRM-ARC.md) · staging
> tenant **theme-1 / Marysoll**. Verifikacija je do sada mašinska (typecheck,
> lint, testovi, build); browser acceptance je zaseban red niže.

| # | Rez | Status | Šta je zaključano | Dokument |
|---|---|---|---|---|
| B-P0 | Semantika cene `0 ≠ null` | ✅ kod | Tri režima: `fixed` tačan, `from` minimum, `on_request` bez ukupne cene. Nepoznata osnovna cena truje ceo zbir — „na upit + stiker 700" nije „od 700 RSD". | [cene](PANTA-BOOKING-PRICING.md) |
| B-P1 | Opaque `ref` u javnom ugovoru | ✅ kod | Varijante, dodaci i stavke paketa nose `ref` uz `name`; `_id` se ne izlaže. `ref` nije autoritet — proverava se da pripada toj usluzi. | [cene §6](PANTA-BOOKING-PRICING.md) |
| B-2A/2B | Server authority + pricing snapshot | ✅ kod | `resolveBookingRequest` razrešava selekciju, trajanje i cenu iz kataloga; `Appointment.pricing` je server-generisan snapshot sa `chargedAmount` odvojenim od vaučerske aritmetike. | [cene](PANTA-BOOKING-PRICING.md) |
| B-1A/1B | Rok, faze i klijentske akcije | ✅ kod | Rok = početak termina − prozor, u zoni salona. Četiri faze uz fail-safe `unknown`. Promeni/Otkaži na kartici. Grace 30 min kao sistemsko pravilo. | [otkazivanje](PANTA-CANCELLATION-NOSHOW-POLICY.md) |
| B-OCC | Occupancy | ✅ kod | Završen ili nedošao termin ne drži vreme; kasno otkazan slot salon može da proda. Jedno pravilo, dva izvedena oblika. | [T3 §8.1a](PANTA-T3-BOOKING-ENGINE.md) |
| B-SEC | ★ Izolacija klijenta | ✅ kod · **browser provera** | `/api/appointments` je klijentu vraćao pune termine celog salona. Filter sada dolazi iz tokena; javni feed nosi četiri polja i nikad cenu. | [ARC §5](PANTA-BOOKING-CRM-ARC.md) |
| B-T1-0 | ★ Stop-the-line hardening | ✅ kod | Unesena cena nije stizala u bazu; `/api/statistics` i `/api/generate-image` bili otvoreni; theme-1 prikazivao sadržaj drugog tenanta; tooltip tvrdio 0 RSD. | [ARC §4](PANTA-BOOKING-CRM-ARC.md) |
| B-T1-0.5 | ★ Service-owned intake | ✅ kod · ✅ migracija | Odluka o zahtevu preseljena sa platformske kategorije na uslugu; jedan checkbox. Server odbija zahtev na usluzi koja ga ne prima. Backfill pokrenut 2026-09-02 (4 usluge, 2 salona). | [intake](PANTA-SERVICE-INTAKE.md) |
| B-T1-1 | ★ Canonical booking/edit/reschedule | ✅ kod · **browser provera** | Jedan seam za sve beauty ulaze osim legacy: klijentska i admin izmena, prihvatanje predloga sa proverom dostupnosti, `variants`/`extras` se više ne odbacuju pri upisu, klijent ne može sam sebi da odobri termin. | [ARC §2–4](PANTA-BOOKING-CRM-ARC.md) |
| B-T1-2 | ★ Jedan booking presentation ugovor | ✅ kod · **browser provera** | Sajt, `/termini`, klijentsko zakazivanje i klijentska izmena dele `BookingModal → BookingProvider` nad `servicePresentation` / `widgetPresentation` DTO-om. Stari `ClientCreateModal` je obrisan. | [ARC §2.2](PANTA-BOOKING-CRM-ARC.md) |
| B-T1-3 | ★ Client 360 CRM dosije | ✅ kod · **browser provera** | Tenant-scoped read model: identitet, termini sa zahtevom i canonical cenom, devet KPI činjenica, loyalty ledger/vaučeri, preporuke. Deep-link `/dashboard?tab=klijenti&clientId=…`. | [Client 360](PANTA-CLIENT-360.md) |
| B-T1-3.1 | ★ Statistics/CRM hardening | ✅ kod | Statistika izdvojena u `lib/statistics/engine.ts` i deljena sa Client 360; prikaz razdvaja potencijalni, završeni i otkazani prihod uz zaseban broj termina bez cene. Loyalty admin hook razložen na četiri hook-a. | [ARC §6](PANTA-BOOKING-CRM-ARC.md) |
| B-T1-4 | ★ Loyalty Redemption & Checkout | ✅ prihvaćeno 2026-09-03 | Points-shop nagrada sa stabilnim identitetom, atomsko skidanje poena u transakciji, jedna pogodnost po terminu, klijentski i admin picker nad istim seam-om, vaučer recompute i Appointment Checkout kao jedini put do `completed`. | [Loyalty §14](PANTA-LOYALTY-ENGINE.md) |
| B-THEME1 | Theme-1 privatna za Marysoll | ✅ kod | Kroz postojeći `THEME_ACCESS` seam, isti kao za theme-8 (Anja) i theme-9 (Marina). Bez `if (tenantSlug)` u komponentama. | [ARC §9](PANTA-BOOKING-CRM-ARC.md) |
| B-AI | AI generisanje slika | ✅ isključeno · odluka | Ne nudi se javno; endpoint je admin + plan gated. Uključuje se kroz plan ako salon zatraži, bez izmene koda. | [AI slike](PANTA-AI-IMAGE-GENERATION.md) |

### Browser acceptance koji čeka

| Šta | Nad čim |
|---|---|
| 🟡 Client 360 — osnovni dosije, statistički gate (Maria bez / Claudia sa), Loyalty prisustvo i odsustvo, link ka preporukama | Marysoll Makeup & Nails |
| 🟡 Canonical izmena termina — klijentska i admin, predlog Prihvati/Odbij | Marysoll |
| 🟡 Jedan booking widget — sajt, `/termini`, panel, izmena | Marysoll |
| 🟡 Izolacija klijenta — klijent vidi isključivo svoje termine | Marysoll |

> **T1-4 je prihvaćen 2026-09-03.** Vlasnik proizvoda je potvrdio ključni
> pricing/checkout tok u aplikaciji; mašinska verifikacija (tsc, lint, 1980
> testova, build) stoji uz to. Preostale T1-4 površine — points-shop editor,
> post-booking ponuda pogodnosti i admin „Primeni pogodnost" — nisu prošle
> zaseban formalni prolaz i, ako se na njima nešto pokaže, tretiraju se kao
> obična greška, ne kao otvoren rez.

## DEFERRED / LATER — ima odluku, nema termin

Ovo se **ne** premešta u NEXT bez nove product odluke.

| # | Šta | Zašto čeka |
|---|---|---|
| **T1-5** | Salonski paketi / entitlement / plaćanje klijentkinje (`ClientPackage`) | Nije tenant Subscription i ne uvodi se payment provider dok ne postoji stvarna potreba. `Service.subscription` opisuje ponudu, ne kupovinu. **Završetak T1-4 ga NE promoviše u NEXT** — points-shop nagrada je vaučer, ne kupljen paket. Sada ima pun ugovor: [Payments §5.4](PANTA-PAYMENTS-ENGINE.md) · [Client 360 §K](PANTA-CLIENT-360.md) |
| **Evidencija naplate + integracija po salonu** | Beleženje depozita koji je salon naplatio svojim kanalom, i integracija salonovog MoR/PSP-a kao naplativa usluga | Granica je zaključana ([PANTA-PAYMENTS-ENGINE.md](PANTA-PAYMENTS-ENGINE.md)): **Marysoll naplaćuje samo pretplatu tenanta**, novac između salona i klijentkinje ne prolazi kroz platformu. MoR model razmotren i odbačen (poreski limit, posredovanje u plaćanju, fiskalna obaveza, Paddle nema mehanizam za isplatu trećoj strani). Gate je postojeći `paymentIntegration` |
| **T3 cutover** | `BookingReservation` / day-lock kao production write authority | Preduslov je occupancy blocker iz [T3 §4.1](PANTA-T3-BOOKING-ENGINE.md); dark core nije live authority pa ne blokira beauty rezove |
| **Legacy write ulazi** | `POST /api/booking` (HMAC gost) i `POST /api/marketplace/appointments` kroz canonical seam | Jedini ulazi koji uzimaju `duration` iz zahteva i cenu `basePrice ?? 0`, bez pricing snapshot-a. Nema aktivnih korisnika tih putanja koji bi to učinili hitnim; ide uz marketplace/platform luk. [ARC §3](PANTA-BOOKING-CRM-ARC.md) |
| **`cleanup:stale-group-items`** | Mrtav `services[]` niz na 2 usluge (marysoll, anja) | Eksplicitno odloženo. Skripta je napisana i idempotentna; pokreće se kad za to bude prilika, ne kao zaseban rez |
| Restriction Engine | Automatska posledica za `noShows` / `late_cancel` | Danas se čuvaju samo činjenice; nema automatskog blacklist-a i neće ga biti dok saloni ne pokažu potrebu |
| Reschedule mejl sa starim i novim terminom | Notifikacija radi, nedostaje stari snapshot u telu | Ne uvode se nova `previousDate/Time` polja zbog kozmetike |
| Intake v1.1 — izbor polja po usluzi | v1 ima samo `enabled` | Uvodi se tek ako upotreba pokaže potrebu; wizard se ne pravi |
| Brisanje theme-3/4/6 | ~7.300 linija, 66 fajlova; baza potvrđena prazna | Preduslov: `Theme3GalleryMasonry` mora u `shared/` jer ga theme-1 i theme-2 uvoze |
| `chargedAmount` na otkazanom, naknada, refund | Nema payment/refund lifecycle-a | Bez engine-a nema smisla projektovati hipotetičku finansijsku politiku |
| Loyalty Phase 3 (tiers, rođendan, AI nagrade) | Redemption je gotov (T1-4); ostaje referral live QA pre nove faze | [Loyalty](PANTA-LOYALTY-ENGINE.md) |

## Zatvoreno van reza

| Šta | Kada |
|---|---|
| **Paddle webhook idempotencija** — `event_id` se nije čuvao, pa je ponovljen `subscription.canceled` obarao salon koji plaća na besplatan plan. Uz to: svežina potpisa, zaštita od prestizanja, `payments.webhook.stuck` integrity check | 2026-09-04, grana `fix/paddle-webhook-idempotency` |
| **theme-1 dimenzije slika** — `next/image` je nosio veličinu prikaza umesto odnosa stranica; uz to `preload` za LCP element | 2026-09-03 |

## Poznat dug — ne menja redosled

Ovo su zabeležene činjenice o zatečenom stanju, ne otvoreni poslovi. Nijedna
stavka ne ulazi u NEXT bez posebne odluke.

| Šta | Priroda | Beleška |
|---|---|---|
| Mrtav `clientInsights` flag | code cleanup | Postoji u `PLAN_FEATURES`, `FeatureGate` i `FeaturesList`, ali ga nijedan runtime gate ne koristi — uključivanje ne radi ništa. Canonical gate je `statistics`. [Client 360 §B](PANTA-CLIENT-360.md) |
| Preporuke u Client 360 bez `testimonials` capability provere | architecture cleanup | Podaci su tenant-scoped, pa nije bezbednosni problem; salon bez te funkcije vidi praznu sekciju. Client 360 UI se sada ne redizajnira. [Client 360 §G](PANTA-CLIENT-360.md) |
| `bookingCore.integration` race test pada pod opterećenjem | technical debt / T3 hardening | Nikad izolovano; produkcijska logika nije menjana zbog njega. Rešava se uz T3 hardening. [ARC §12](PANTA-BOOKING-CRM-ARC.md) |
| Admin create ne nudi intake | current limitation | Klijentske površine nude zahtev kad ga usluga traži. Nije odlučeno da salon mora unositi zahtev klijentkinje kada ručno pravi termin — uvodi se samo ako upotreba pokaže potrebu. [intake §8](PANTA-SERVICE-INTAKE.md) |

## Booking / Consultation — odloženo, ali neophodno

Novi Edu luk **ništa od ovoga ne zamenjuje** i izričito ne dira Booking Engine.

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| 4 | Booking UI apstrakcija | 🟡 prikaz gotov | `useBookingFlow` + theme-9 dijalog, **offering-first**: ponuda → datum i vreme → upitnik → pregled → potvrda (redosled nije kozmetika — vidi ugovor `initialOfferingId` niže). Launcher kroz kontekst, terminologija `offering*`, ne `service*`. **Bez ijednog upisa** — slanje samo šalje mejl vlasnici i superadminu, da potvrdi usluge, cene, termine i pitanja. Ostaje: `bookingProductAdapter` i `BookingThemeTokens` za ostale teme. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#33-readavailability-potrošači-nisu-write-authority) + T2 §6.10/6.11 |
| 6 | ★ T3 cutover — migracija + concurrency gate | ⏸ odloženo · **day-lock neophodan** | Dark core (kanonska rezervacija, day-lock, idempotencija, receipt/outbox) postoji i prolazi ReplSet testove; nijedna ruta ga ne poziva. Cutover je odložen jer trenutno nema aktivnih Booking korisnika na novom putu, a prednost je dobio vidljiv frontend dokaz. **Preduslov pre cutover-a:** occupancy blocker — produkcija oslobađa slot na `completed`/`no_show` odmah, dark core ga drži do kraja termina. Day-lock ostaje hard gate pre reda 10. | [T3 §4.1](PANTA-T3-BOOKING-ENGINE.md) |
| 7 | Consultation domen | ⏸ preskočen · neophodan | `ConsultationOffering` → `ConsultationBooking` → `BookingReservation`. Marinin glavni proizvod; **nije `Service`**. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#142-consultation-i-education-granica) |
| 8 | Hold | ⬜ nije počet | `BookingHold` kroz istu day-lock transakciju; konkretan TTL ostaje product odluka Slice 8. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#20-bookinghold-i-slot-transition) |
| 9 | Questionnaire + Intake | ⏸ preskočen · neophodan | Guest-first booking ostaje moguć; generički intake čuva immutable početni snapshot, odvaja stručni Current Assessment od originalnog odgovora i kasnije podržava eksplicitni claim/invite identity handoff. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md#4-product-decision--consultation--skin-care-kutak-lifecycle) |
| 10 | ★ theme-9 booking end-to-end | ⬜ nije počet | Hero CTA → widget → modal → intake → preview → hold → atomic booking. **Marina sme primati konsultacije tek odavde.** | PANTA-T3-BOOKING-ENGINE.md |

## Education → zaseban dokument

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

**STANJE: Edu Centar v1 je u PILOT CLOSURE-u.** Stvarni feedback je dovoljan;
redosled se više ne izmišlja unapred i ne pravi se novi plan dokument.

| Red | Rez | Status | Acceptance / granica |
|---|---|---|---|
| **E1** | Public Education discovery | ✅ **kod** | Theme-9 Teme čita pravi `publishedSnapshot` kroz `education.topic-hub`; eksplicitni `isDemo` je jedini fixture seam; landing prikazuje 0 ili 4–6; `/edukacija` zadržava kartice i dobija Sve + četiri non-empty `topicKey` filtera. `topicKey`/`intentKey` su snapshot metadata, a `hero.subtitle` ostaje opis. |
| **E2** | Authoring clarity | ✅ **kod · browser acceptance pending** | Pregled i direktni `/new` nude tri jasna ulaza: Članak / Import PDF-DOCX / Video. Novi članak i video dobijaju canonical preset bez praznog DB zapisa; import ostaje article draft. Editor prati Osnovno → Tema/cilj → dominantan sadržaj → slika → opcioni canonical `FileDownloadBlock` → pristup → Napredno. Taxonomy je radio-card prikaz E1 resolvera; incomplete blok pokazuje konkretan razlog. Importer i autosave nisu prepisani. |
| **E3** | Draft safety acceptance/hardening | **NEXT** | Editor već ima lokalni durable draft, debounced revision-safe autosave, recovery i exit flush; E2 ih nije menjao. E3 proverava realni browser tok i završava potpuni online/offline/saved status, bez rewrite-a postojećeg sistema. |
| **E4** | Blog | ⬜ posle E3 | Poseban Blog tab: Svi tekstovi / Novi blog; manual/import first nad postojećim Content Composer-om. `NewsletterCampaign` landing persistence ostaje privremeni backend adapter; Newsletter i Blog su odvojeni u UX-u. |
| **E5** | Pilot acceptance | ⬜ posle E4 | Marina bez procedure pravi: članak od nule, članak iz PDF/DOCX, Video i Blog. Pilot je zatvoren kada ne pita „gde ovo ide?". |

Canonical detalji, classification vocabulary i presentation/autosave contracts:
[Edu Centar v1 — pilot closure](PANTA-EDU-CENTAR-ARC.md#edu-centar-v1--pilot-closure--revised-target-2026-09-04).

## Završeno ranije — platformski rezovi

| # | Slice | Status | Gde smo stali | Dokument |
|---|---|---|---|---|
| H0 | Theme-9 content preservation | ✅ gotovo | Admin forma koristi deljeni lossless write mapper, a server sekcijski dopunjava nepotpun stariji payload. Regresioni testovi čuvaju 7 theme-9 sekcija, hero/about dodatke, `themePages`, `themeBookingPreview`, buduće polje i namerne `[]` / `false` / `""` izmene. | [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md#sledeći-hard-gate) |
| 0A | T2B v0.3 architecture lock | ✅ gotovo | Zaključani su optional `verticals`, legacy beauty runtime default, minimalni tenant override, readiness, jedan server gate i Shared-DB Safety Contract bez obaveznog globalnog backfill-a; foundation implementaciju prati red 0B. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md) |
| 0B | T2B-A capability foundation | ✅ gotovo | Implementirani su optional Tenant persistence ugovor sa očuvanom `undefined` legacy semantikom, registry, pure/server resolver, postojeći plan adapter, `requireCapability()` i eksplicitni beauty provisioning za svaki novi Tenant. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md#9-implementacioni-status) |
| 0C | T2B-B triple-gate integration | ✅ gotovo | Implementirani su server capability snapshot, admin/client workspace projekcija, business API gate-ovi, public Feature Block gate i readiness politika; permission i ownership ostaju zasebne granice. | [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md#5-jedan-resolver-tri-obavezna-gate-a) |
| 1 | Workspace IA dokument | ✅ gotovo | Zaključane su BEAUTY, EDUCATION-FIRST i HYBRID admin/client matrice, permission i resource-ownership granice. JSX i capability-aware navigacija su preuzeti Edu lukom (Faza 0 i 6A); ostatak je „Salon workspace migration" u Kasnije. | [PANTA-ADMIN-CLIENT-WORKSPACES.md](PANTA-ADMIN-CLIENT-WORKSPACES.md) |
| 3 | `availability-core` | ✅ gotovo | **Urađeno:** `@panta/booking-engine` — `AvailabilityQuery → AvailabilityResult`, čist TS bez React/Next/DB i bez I/O; `[start, end)`, eksplicitna zona, DST, pauze i odmori kao rez intervala, ručni termini pod istim overlap ugovorom, `availabilityClass` + `outsidePreferredHours` kao ULAZ za Slice 5. Domen ostaje u `lib/booking/availabilityAdapter.ts`. Ponovljena provera: **33 paket testa + 48 adapter/widget testa = 81 fokusirani test**; svi prolaze. Migrirane su obe `slots` rute, oba javna widgeta, `BookingProvider` i tadašnji klijentski modali (`ClientCreateModal`/`ClientEditModal`, koje je T1-2 kasnije zamenio deljenim `BookingModal`-om); stare kopije su uklonjene ili zadržane samo kao zamrznuta regresiona referenca. **Van Slice 3:** serverski upis još ne koristi novi core i ne učitava `vacations`, a modalni tok još ne prima `vacations` kroz ceo lanac propova. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#21-coexistence-i-migracija) |
| 5 | ★ T3 Booking Engine CORE | ✅ dark core implementiran | Additive `BookingReservation`, `BookingDayLock`, durable receipt/outbox, neutralne lifecycle komande, write-time availability, legacy reader i Service/Appointment transaction adapter postoje; 35 novih fokusiranih testova (21 pravi MongoMemoryReplSet) prolaze. **Nije live authority:** production rute nisu migrirane, deployment transaction smoke ostaje hard release gate, a outbox worker/reconciliation i cutover pripadaju Slice 6. | [PANTA-T3-BOOKING-ENGINE.md](PANTA-T3-BOOKING-ENGINE.md#211-slice-5--dark-core) |

## Kasnije — bez datuma

| Šta | Odakle | Zašto čeka |
|---|---|---|
| **Salon workspace migration** | ostatak starog Slice 12 | Edu plan je preuzeo `/education/*`, `Moj Prostor` i Client 360. Ostaje samo prevođenje ~15 salon tabova u workspace strukturu — nije prioritet za Marinu |
| **Generic Care Domain** ⏸ preskočen · neophodan | stari Slice 13, preimenovan | `CareJourney` / `CarePlan` / `CareDocument` / `ProgressMedia`. Prvo vidimo šta `SkincareGuide` + `GuidedProgram` + follow-up stvarno traže, pa tek onda generalizujemo — sigurnije od apstrakcije unapred |
| **H1 Multi-workspace identity** | Edu revised target | Jedan `AuthUser` poseduje/pripada više tenant/workspace-a; switcher bira biznis. Preduslov za ukidanje istog-tenant hybrid UX-a |
| **H2 Registration bez hybrid izbora** | posle H1 | „Kreiraj Salon" ili „Kreiraj Edu Centar"; postojeći owner može dodati novi workspace pod istim loginom |
| **H3 Existing hybrid migration** | posle H1/H2 | Podeliti hybrid na Salon + Education tenant uz eksplicitna pravila za EducationContent, settings, blog, branding, domen i education clients/assignments; Beauty ostaje Salonu |
| **H4 `verticals[]` kao interni mehanizam** | posle H3 | Ne mora odmah nestati, ali više nije product UX model niti razlog da Salon i Edu dele sajt |
| **CPU metrika u superadmin panelu** | `platformUsage.ts` | Danas hardkodovan `null`; traži Atlas Admin API + klaster **M10+** (M0 ne izlaže hardverske metrike). Storage i konekcije rade i sada, preko obične konekcije. Okidač: prelazak na M10 kad broj tenanta preraste free tier (procena ~20+). Atlas Service Account do tada nije potreban — pušten je da istekne 2026-09 |
| **F4 Growth Content Coach** | posle pilot closure-a | Saveti za konkretan problem, search intent, naslov i CTA; nije AI generator generičkih tekstova |
| **F5 Marketing Center** | posle Content Coach-a | Objavljen sadržaj → brand-aware cover, carousel, Story, Reel, newsletter teaser i CTA iz tenant design system-a |
| **F6 Superadmin trend/marketing knowledge** | budući Growth OS | Održava prompt/knowledge sloj, SEO/title/social obrasce, smernice i industry primere |
| **F7 consultation/intake procene kože** | budući domenski rez | Zaseban consultation/intake proizvod; ne uvoditi kroz CMS editor |
| **DIAG-EDU-1** — Education integrity provere | posle Marina pilota | Registry pokriva Identity, Loyalty, Appointment, ownership, SEO i push; Education nema nijednu. Tri najvrednije provere mere granice pristupa nad **stvarnim** podacima, a ne nad izmišljenim iz testova |
| **DIAG-SUPPORT-1** — „Pošaljite problem podršci" | posle Marina pilota | Snapshot iz postojećeg Diagnostic Engine-a + kontekst aplikacije → **sačuvan incident**, pa tek onda obaveštenje/mejl/push. Ako slanje zakaže, report ostaje. Privacy granica: metapodaci da, sadržaj korisnika ne |
| **Read-model cleanup** | dug iz H0 | Write loss je zatvoren; višestruke ručne read projekcije `SalonProfile` ostaju |


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
- **⚠️ Dve occupancy semantike koje se moraju spojiti pre T3 cutover-a.**
  Produkcija (`lib/appointments/occupancy.ts`) oslobađa slot na `completed` i
  `no_show` **odmah** — to je namerno, jer kasno otkazan termin salon mora moći da
  proda. Dark core (`lib/booking/occupancyStatus.ts`) za legacy zapise koristi
  `blocking_until_end`, jer legacy `no_show` nastaje već pri kasnom otkazu. Danas
  se ne sudaraju samo zato što produkcijski upiti unapred filtriraju statuse.
  Nije blokirao T1-4 (dark core nije live authority), ali jeste hard preduslov
  cutover-a — [T3 §4.1](PANTA-T3-BOOKING-ENGINE.md).
- **Nijedna API ruta ne sme kreirati ni menjati occupancy mimo Booking Engine-a.**
- **Salon nikada ne postoji bez vlasnika, ni vlasnički nalog bez salona.**
  Jedina destruktivna owner akcija je „Trajno obriši salon", koja briše ceo
  tenant boundary. Ownership transfer je specifikovan i ODLOŽEN — vidi
  [PANTA-TENANT-OWNERSHIP-LIFECYCLE.md](PANTA-TENANT-OWNERSHIP-LIFECYCLE.md).
- **Consultation nije `Service`** — ne sme deliti `services.catalog` ni `booking.services`.
- **Tenant → Workspace → Presentation i dalje razdvaja authority od prikaza.**
  CURRENT isti-tenant Salon + Edu ostaje legacy transition radi pilota.
  **TARGET:** Salon i Edu su odvojeni business workspace/tenant-i sa zasebnim
  sajtovima/domenima pod istim `AuthUser` nalogom. Admin workspace sme postojati
  pre javne prezentacije. Vidi revidirani Edu contract i postojeće pravilo
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

## H0 — lossless admin save (zatvoreno)

✅ **Zatvoreno.** Zadržano jer objašnjava invariant koji čuvaju regresioni
testovi, ne kao dnevnik. `useSalonProfileAdmin` koristi deljeni lossless write
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


## Zatečeni dugovi — otvoreni

Zatvoreni dugovi iz T2/T3 rada (kopije kalendarske logike, `getWorkingRange`,
overlap samo po početku, `vacations`, theme whitelist, engleski ključevi dana,
`ThemeShellProps`, theme-9 schema/CMS polja, H0 lossless save, scope po golom
`_id`-ju) **više se ne vode ovde** — žive kao invarianti u svojim ugovorima i
kao regresioni testovi.

| Dug | Gde | Zatvara ga |
|---|---|---|
| TOCTOU trka pri zakazivanju — nema jedinstvenog occupancy autoriteta ni booking idempotencije na produkcijskom putu | 12 Appointment occupancy/lifecycle + 4 Slot write ulaza | T3 cutover; [potpun inventory](PANTA-T3-BOOKING-ENGINE.md#3-potpun-inventar-write-putanja) |
| Reschedule je centralizovan kroz `clientFlows`/canonical seam, ali i dalje radi „check → save" bez serijalizacije | `api/appointments/update/[id]`, `clientFlows` | T3 cutover; [atomic contract](PANTA-T3-BOOKING-ENGINE.md#13-atomic-reschedule-cancel-i-lifecycle) |
| Legacy marketplace `Slot.reserve` je atomski petominutni reserve, ali nema vlasnički token, nije vezan za `Appointment` i ne štiti ostale tokove | `models/Slot.ts`, `api/marketplace/slots/{reserve,book}` | Slice 5/8 — integrisati kao izveden prikaz ili ukloniti kao drugi izvor istine |
| `themeBookingPreview` je PRIVREMENO polje — briše se kad stignu Consultation domen i Booking Engine | `models/SalonProfile.ts` | Slice 5/7 |
| Preview tekst obećava potvrdu/pomeranje termina, a završni ekran tačno kaže da termin nije zakazan | theme-9 seed sadržaj + `Theme9BookingDialog` | pre javnog QA uskladiti poruku da korisnica ne pomisli da je zahtev rezervacija |
| `themePages` nema urednička polja — sadržaj se autoriše kroz `npm run seed:theme9 -- --tenant=<slug>` | `AdminLandingCMS.tsx` | otvoreno; polja postoje u bazi, editor ih ne prikazuje |
| `theme-3/BlogSection` dovlači objave klijentskim `useBlogPosts` iako `content.blog` loader isporučuje `posts` | `theme-3/BlogSection.tsx` | otvoreno, trivijalno |
| Više ručnih read projekcija istog `SalonProfile` dokumenta — novo polje može tiho nestati jer su polja opciona | mongoose schema · javni profile API · `ClientHomePage` | otvoren read-model dug; H0 write rizik je zatvoren |
| `design/` handoff bundle je izuzet iz analize, ali workspace nema instaliran `fallow` executable | `.fallowrc.jsonc` | otvoreno; nova health/dead-code analiza traži instalaciju |

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
