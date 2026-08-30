# PANTA — Edu Centar: workspace arhitektura i Education domen

> **Status:** ZAKLJUČANA ARHITEKTURA; FAZE 0, 1 I 2 IMPLEMENTIRANE; F3A/EDU UI-1A SELECTOR + ACTIVATION CODE COMPLETE, MARINA BROWSER ACCEPTANCE PENDING; **EDU UI-2 + UI-2B (EducationContent, CMS CRUD, F3B gate-ovi, durable working copy + published snapshot) IMPLEMENTIRANI, ČEKAJU MARINA CMS BROWSER TEST.**
> Kanonski dokument za Edu luk. Poslednja izmena: 2026-08-29 · `staging/production-engines`
>
> **Faza 0 je počela tek pošto je Theme-9 contract/rollout foundation zatvoren i
> staging postao aktivna razvojna linija za Edu luk; sada je završena.**
> 2A/2B/2C su na `main`-u; dalji Theme-9 + Edu razvoj i QA vode se staging-only.
>
> Product/domenski ulaz je u tri prateća dokumenta:
> [EDUCATION_CAPABILITY_GATE_AND_ADOPTION.md](EDUCATION_CAPABILITY_GATE_AND_ADOPTION.md) ·
> [MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md](MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md) ·
> [SKINCARE_EDUCATION_DOMAIN_PRODUCT_PARTNERSHIP.md](SKINCARE_EDUCATION_DOMAIN_PRODUCT_PARTNERSHIP.md)

## Zašto ovaj dokument postoji

Posle dogovora sa Marinom zaključan je product contract koji **nije** „sajt sa edukacijama + zakazivanje", nego pravi tok rada sa klijentom:

```
INTAKE → CONSULTATION → ASSESSMENT → SKINCARE GUIDE
       → ASSIGNED EDUCATION → FOLLOW-UP → NOVA VERZIJA
```

Tri sloja se **ne smeju** spojiti u jedan sistem, i **nijedan ne sme postati vlasnik druga dva**:

```
CONTENT-CENTRIC          CLIENT-CENTRIC              AUTHORING
EducationContent         TenantUser                  Content Composer
→ public/gated/private   → Client 360 / Moj Prostor  → Newsletter
→ /edukacija             → Guide / Program /         → Education
                           Edukacija / Termini       → Guide blokovi
```

Uz to je zaključana šira granica: **„Salon + Edukacija" nije treći tip sistema**, nego kombinacija dva capability seta nad istim tenantom. Bez te odluke Edu Centar postaje „još nekoliko tabova u salon dashboard-u", pa se za šest meseci rastura admin navigacija, klijentski profil i modeli.

**Ishod:** Marina piše sadržaj, dodeljuje ga klijentima, pravi Guide i program — pre nego što Booking Engine bude gotov. Zakazivanje se do tada dogovara ručno.

---

## Zaključane odluke

| Odluka | Izbor |
|---|---|
| PDF izvoz | **Browser print**, nula zavisnosti; dugme se zove **„Sačuvaj / štampaj PDF"**, ne „Preuzmi PDF" |
| Izvor za `/edukacija` | **Samo novi `EducationContent`**; `/blogs` nastavlja nad `NewsletterCampaign`, netaknut |
| Blog i Edukacija | **Dva nezavisna javna kanala**, ne zamena jedan za drugog: `/blogs` → `NewsletterCampaign`, `/edukacija` → `EducationContent`. Tenant sme imati jedan, drugi ili oba; svaki nav link se razrešava nezavisno po svojoj capability/readiness proveri |
| Pristup sadržaju | **Tri stanja: `public` / `gated` / `private`** — vidi [Pristup sadržaju](#pristup-sadržaju--public--gated--private-zaključano-2026-08-29). Pretplata/kupovina/ručno odobrenje nisu četvrto stanje nego izvori prava pristupa |
| Capability | **Pun gate**, ali wiring i aktivacija su **razdvojeni** (Faza 3 vs release gate u Fazi 5) |
| Klijentske rute | `Moj Prostor` tab + pod-rute ispod `/panel`; `Moj Profil` ostaje samo identitet/podešavanja |
| Admin rute | `/education/*` kao zaseban workspace; presedan `src/app/marketing/*` |
| Klijenti | **Horizontalni modul**, ne unutar Edu Centra — klijent pripada tenantu, ne modulu |
| „Salon + Edu" u bazi | **NE kao `tenantType`**; postojeće `verticals: ["beauty","education"]` |
| Vlasničko polje | **`clientProfileId`** na svim client-owned modelima |

---

## Gde ovo stoji u odnosu na tekući rad

Poseban, kasniji luk. Theme-9 2A/2B/2C foundation je spojena u `main`, a staging
Release A/migration rehearsal je završen.

**Ulazni gate za Fazu 0 je zatvoren:** Theme-9 contract/rollout foundation je
završen i `staging/production-engines` je aktivna razvojna linija Edu luka.

---

## Šta već postoji (i ne treba graditi)

Temelj za vertikale je **već napravljen** u T2B slice-ovima 0A/0B/0C:

- `TENANT_VERTICALS = ["beauty", "education"]` — `src/types/tenant-capabilities.ts:3`
- `Tenant.verticals?: TenantVertical[]` sa validacijom — `src/models/Tenant.ts:113`; `undefined` = legacy pre-T2B, **nikad persistence default**
- `resolveEffectiveVerticals()`, `resolveCapability()` triple-gate — `src/lib/platform/capabilities.ts`
- `requireCapability()` server gate — `src/lib/platform/capabilities-server.ts`
- `education.catalog`, `education.inquiries`, `booking.education` **već registrovani**
- `src/app/marketing/{campaigns,audience,analytics,ab-test}` — dokazan obrazac za zaseban admin workspace
- `Appointment.clientProfileId` i `Testimonial.clientProfileId` (oba `ref: "TenantUser"`, tenant-first indeks) — **Beauty deo Client 360 već ima podatke**

Faza 0 nije nova arhitektura, nego **aktiviranje postojeće**.

---

## Vokabular vlasništva (obavezan)

```
TenantUser._id
      ↓  clientProfileId
Appointment · Testimonial · ClientContentAssignment
SkincareGuide · GuidedProgram
```

`actorScopeFrom()` (`src/lib/auth/tenantScope.ts`) **hardkodira** `clientProfileId` u ownership filter kada je pozivalac klijent. Svaki novi client-owned model koji koristi drugo ime gubi taj ACL besplatno. Ovo nije kozmetika.

---

## FAZA 0 — Vertical & workspace foundation

**0.1 Registration preset.** `createInitialTenantCapabilityConfiguration()` (`src/lib/platform/capabilities.ts:195`) hardkodira `verticals: ["beauty"]`. Postaje preset-svesna:

```
createInitialTenantCapabilityConfiguration(preset: "salon" | "education" | "hybrid")
```

- `salon` → `["beauty"]` + postojeći `legacyBeautyDefault` skup
- `education` → `["education"]` + education preset
- `hybrid` → unija

⚠️ Bez prosleđenog preseta funkcija mora vratiti **tačno današnji rezultat** — regresiona granica.

**0.2 Neutralan registration contract.** `/api/tenants/register` je danas eksplicitno salon onboarding (`salonName`, kreira `SalonProfile`). Novi ugovor:

```
{ businessName, preset: "salon" | "education" | "hybrid" }
```

uz **backward-compatible prihvatanje `salonName`** dok se UI ne migrira.

⚠️ **Ne raditi preimenovanje `SalonProfile` → `SiteProfile`** — Theme sistem zavisi od njega. Education tenant privremeno dobija `SalonProfile` kao **legacy presentation profile**; to mora biti zapisano u kodu da kasnije niko ne zaključi da je Education domen zapravo Salon domen.

**0.3 Ekran izbora pri registraciji** — tri kartice (Salon / Edukacija / oba). Izbor bira preset, **ne** piše `tenantType`.

**0.4 Module provisioning ugovor** — „Aktiviraj Edu Centar" dodaje capability set **istom** tenantu; ne pravi novi tenant, ne dira klijente, brending ni pretplatu.

⚠️ **Implementirati provisioning, ali NE puštati dugme** dok proizvod ne postoji (Faza 5).

**0.5 `/education` route boundary** — `src/app/education/` sa `page.tsx`, `offerings/`, `inquiries/`. Ostalo (`content`, `programs`, `analytics`) dolazi sa svojim fazama; granica postoji od početka.

⚠️ Dodati `"education"` u `PLATFORM_PATH_SEGMENTS` (`src/lib/platform/host-context.ts:132`). `RESERVED_TOP_SEGMENTS` (`src/lib/proxy/constants.ts:72`) spread-uje taj skup, pa je **jedan unos dovoljan** — nema dupliranja.

**0.6 Salon se NE dira.** Postojećih ~15 dashboard tabova ostaje. Novi Education workspace se pravi po budućem modelu; Salon se migrira kasnije, zasebno.

### Implementacioni status Faze 0

- ✅ preset-aware capability konfiguracija uz identičan legacy salon default
- ✅ neutralni `businessName` + `preset` registration contract uz `salonName` kompatibilnost
- ✅ registration UI sa Salon / Edukacija / Salon + Edukacija izborom
- ✅ idempotentno Edu provisioning jezgro nad istim tenantom; javni CTA ostaje zaključan do Faze 5
- ✅ zaštićena `/education`, `/education/offerings` i `/education/inquiries` workspace granica
- ✅ `education` je platformski rezervisana putanja; Salon workspace nije menjan

Faza 0 ne uvodi `tenantType`, ne preimenuje `SalonProfile`, ne dodaje F1 sadržaj i
ne menja Theme-9. Education tenant privremeno i dalje koristi `SalonProfile` samo
kao presentation profile.

**Zapisati kao budući put, ne implementirati:** `AuthUser.email` je globalno unique i register vraća 409 ako owner email postoji. „Neka napravi drugi nalog" **nije** dugoročno rešenje za odvojene Salon/Education biznise istog vlasnika. Ispravan put je jedan `AuthUser` → više `Tenant`-a („Kreiraj novi Marysoll workspace"). `TenantUser.authUserId` je već opciona veza sa izričitom napomenom da **ne sme** biti auth authority, pa sadašnja identity arhitektura to ne sprečava.

---

## FAZA 1 — Content Composer (deljeni sloj)

⚠️ **Nulta pokrivenost testovima.** Nijedan test ne referencira `landing-blocks`, `sanitizeLayout`, `scoreLayout`, `ctaCatalog`.

**1.1 Karakterizacioni testovi PRE ijedne izmene** — `sanitizeLayout`, `scoreLayout`, filter+sort u rendereru, i ručna izmena → save → publish bez AI poziva. Jedina zaštita da Newsletter ne pukne.

**1.2 Izmestiti generički deo** (već generičko, seli se bez izmene):

| Šta | Odakle |
|---|---|
| Editor blokova | `src/components/admin/campaign/LandingBlocksEditor.tsx` (importuje samo heroicons + `LandingBlock`) |
| Registry | `src/components/layout/blockRegistry.ts`, `src/types/block-landing-map.ts` |
| View komponente (6) | `src/components/blocks-ai/*.tsx` (props samo `{ block }`) |
| Sanitizacija / parse | `src/lib/conversational/editor/{sanitizeLayout,aiToLayoutAdapter}.ts` |
| Blokovi → tekst | `src/lib/conversational/ai/extractTextFromBlocks.ts` |
| Scoring | `src/lib/conversational/layout-engine/scoreLayout.ts` |
| SEO agent | `src/lib/ai/agents/seoAgent.ts` (već domenski neutralan) |

Cilj: `src/components/content-composer/`, `src/lib/content/{blocks,schemas,registry,render}/`.

**1.3 Tri raspetljavanja:** ukloniti re-export `CtaKey` (`src/types/landing-blocks.ts:3`); ukloniti `LandingSeo` iz `PreviewRenderer.tsx` i izdvojiti hardkodirani naslov + SEO panel u slot; obrisati neiskorišćen `_campaign` parametar u `buildCampaignLayout.ts`.

**1.4 Spojiti dva renderera.** `PreviewRenderer` i `CampaignLayoutEngine` imaju identičan filter+sort. Jedan `<BlockList>`. Usput: registry se **ne koristi kao registry** — oba imaju ručni `switch`. Prelazak na `blockRegistry[block.type]` čini dodavanje bloka izmenom jednog fajla.

**Ne dirati:** `AdminSemanticModal.tsx`, `src/hooks/newsletter/*`, `ctaCatalog.ts`, `landingPageAgent.ts`, `src/app/api/{campaigns,newsletter}/**`, `NewsletterCampaign.ts`. Campaign fajlovi postaju tanki adapteri.

**Ne portovati:** `useAutoOptimizeLayout` (strukturno ne može poboljšati layout), mrtvi tipovi u `src/types/conversational/layout.ts`, `visibility: "minimized"` (nedostižan i neobrađen).

### Implementacioni status Faze 1

- ✅ karakterizacioni testovi zaključavaju sanitize, score, render filter/sort i ručni edit → save/publish bez AI poziva
- ✅ generički editor i šest postojećih view komponenti žive u `src/components/content-composer/`
- ✅ schema/parse, sanitize, text extraction, score, registry i SEO generator imaju domenski neutralno vlasništvo u `src/lib/content/`
- ✅ preview prima header/metadata slotove; Newsletter naslov i SEO panel ostaju u tankom campaign adapteru
- ✅ preview i public campaign renderer koriste isti registry-driven `BlockList`
- ✅ `CtaKey` re-export je uklonjen, campaign objekat više nije zavisnost shared layout buildera, a `minimized` nije prenet u novi contract

Faza 1 ne dodaje nove blokove, write-time Zod gate, Education modele ili
capability wiring. `AdminSemanticModal`, newsletter hookovi/API rute,
`ctaCatalog`, `landingPageAgent` i `NewsletterCampaign` nisu funkcionalno menjani.

---

## FAZA 2 — Novi blokovi i rupe u editoru

**2.1** `VideoBlock` (`provider: youtube|vimeo|upload`), `TableBlock`, `CalloutBlock`, `ChecklistBlock`, `FileDownloadBlock`, `ImageGalleryBlock`. Meet/Zoom **ne ide** u `VideoBlock` — to je događaj, ne edukativni video.

**2.2 Rupe koje Education mora popuniti:** nema dodavanja bloka, nema brisanja bloka, nema uređivanja slika, nema dodavanja sekcije/stavke cenovnika.

**2.3 Zod validacija na upisu.** `NewsletterCampaign.landingPage.layout` je `Schema.Types.Mixed`; save/publish pišu neprovereno. Deljeni sloj preuzima validaciju — najjeftiniji dobitak na ispravnosti u celom zahvatu.

### Implementacioni status Faze 2

- ✅ **F2A — Content authoring contract + generic editor UX.** Postojećih šest
  persisted discriminanata ostalo je netaknuto; dodat je canonical
  `ContentBlock` alias, centralni draft/publish validation contract sa statusima
  `VALID` / `INCOMPLETE` / `INVALID` / `HIDDEN`, immutable pure operacije i
  draft factories. Shared controlled editor sada podržava manual empty start,
  picker, selection/collapse, add, move, hide/show, duplicate i potvrđeni delete.
  `FeatureBlock.sections` i `PricingBlock.items` podržavaju add/delete, a editor
  preview bezbedno označava incomplete/invalid draft umesto da obori renderer.
- ✅ **F2B — šest blokova + shared media UX.** Canonical contract i registry sada
  imaju ukupno 12 PascalCase discriminanata. `VideoBlock`, `TableBlock`,
  `CalloutBlock`, `ChecklistBlock`, `FileDownloadBlock` i `ImageGalleryBlock`
  imaju draft factory, strict validaciju, editor, neutralni semantički renderer,
  text extraction i graceful preview degradation. Provider-neutral
  `ContentAssetRef` / `ContentImageRef` i injected media adapter povezuju editor
  sa postojećim image/video/file upload autoritetima; Content Composer ne zna za
  Cloudinary, auth ili tenant foldere. Replace neuspeh čuva staru referencu, a
  remove ne briše remote asset. Ista image kontrola popunjava i image polja šest
  ranijih blokova. Postojeći `{src, alt}` sadržaj ostaje kompatibilan.
- ✅ **F2C — persistence/save/publish Zod hardening.** Postojeći F2A
  `validateContentDocument` je server write authority nad Newsletter landing
  layoutom: draft save dozvoljava `VALID` / `INCOMPLETE` / `HIDDEN`, publish
  samo `VALID` / `HIDDEN`, a validation failure vraća structured HTTP 422 pre
  bilo kakve mutation. Transient media ref je `INVALID`; nedostajući media
  ostaje `INCOMPLETE`. Save/publish persistiraju originalni dozvoljeni JSON kroz
  targeted, lossless update i jedan save; publish više nema pre-validation
  status mutation i čuva `customCtas`.

**FAZA 2 — ZAVRŠENA.** Shared lifecycle je authoring → draft validation → draft
save → preview → publish validation → host persistence → public render. Content
Composer poseduje content readiness; host poseduje permissions, lifecycle,
storage i public exposure. Faza 2 ne uvodi `EducationContent`, Education rute,
Theme/Layout blokove, capability wiring niti novi presentation sistem.
F2B takođe ne menja AI schema/prompt: AI i dalje generiše originalnih šest
blokova. Eksplicitni FULL REGENERATE u Newsletter hostu i dalje zamenjuje ceo
layout; merge ručnih blokova ostaje zaseban host UX dug.

---

## FAZA 3 — Vertikalni capability wiring

Faza 3 se više ne implementira horizontalno za površine koje još ne postoje.
Seče se uz stvarni UI i svaki naredni domen dobija gate tek kada dobije svoj
route/API boundary.

### F3A — Admin workspace capability i navigacija (EDU UI-1)

- `TenantCapabilitySnapshot` additive projektuje server-resolved `verticals`;
  legacy missing vrednost ostaje `beauty`;
- `education.catalog` je platformski dostupan kao postojeći-plan `core` samo za
  ovaj workspace/content foundation; tenant provisioning ostaje obavezni gate;
- `education.inquiries` i `booking.education` ostaju `platformAvailable: false`
  i `plan: UNMAPPED`;
- `/education/*` ima server auth + tenant + `education.catalog` authority;
- beauty vidi Salon, education-first Edu Centar, a hybrid jasan Salon ↔ Edu
  Centar switch;
- Education sidebar prikazuje samo Pregled i Sadržaj;
- `/education/content` i `/education/content/new` su namerni UI shell-ovi bez
  persistence-a ili throwaway forme.
- workspace control je jedan accessible dropdown, ne aktivni link koji vodi na
  istu rutu; hybrid owner bira Salon ↔ Edu Centar, a URL ostaje authority za
  trenutno aktivni workspace.

**Status:** code complete; staging browser acceptance je obavezan pre UX
prihvatanja. Production deployment ostaje zasebna release odluka.

#### Workspace availability nije automatski tenant upgrade

Postojeći beauty tenant ostaje beauty-only sve dok owner eksplicitno ne izabere
**Aktiviraj Edu Centar** i potvrdi mutaciju. Selector pre aktivacije prikazuje
aktivni Salon i zaseban activation CTA; ne predstavlja Edu Centar kao već
dostupan workspace.

Aktivacija je tenant-scoped, idempotentna canonical operacija:

```text
beauty tenant
  → explicit owner confirmation
  → addEducationCapabilityConfiguration(existingTenant)
  → verticals: [beauty, education]
  → isti tenant postaje hybrid
```

Ne kreira se drugi tenant i ne menjaju se `SalonProfile`, postojeći sadržaj,
Salon theme ili Theme-9 konfiguracija. Drugačija buduća Education vizuelna
prezentacija nije razlog da se zahteva drugi tenant: razdvajanje tenanta ostaje
business/brand odluka, ne theme workaround. Education theme arhitektura ovde
nije definisana.

`core` ovde nije nova pricing odluka: postojeći plan model nema Education
entitlement. Najmanji eksplicitni contract je platform availability ∩ postojeći
tenant provisioning. Pravi Education pricing/entitlement može kasnije zameniti
plan source bez promene workspace identiteta.

### F3B — Domain/API gate uz EducationContent (EDU UI-2)

Tek kada postoje `EducationContent` model i CRUD rute:

- svaki write/read API dobija `requireCapability("education.catalog")`, tenant
  scope i permission gate;
- `/education/content` prelazi sa shell-a na stvarni CRUD + Content Composer;
- readiness se računa iz stvarnog sadržaja, ne iz postojanja workspace-a.

Public `education.*` block wiring, `/edukacija` readiness i client/assignment
gate-ovi dolaze tek sa odgovarajućim UI-2/UI-3/UI-4 površinama. Ne uvoditi
capability wiring za nepostojeći UI.

⚠️ `src/lib/platform/blocks/registry.test.ts` tvrdi tačan broj/spisak blokova i
da **nijedan domenski blok nema `capability: null`** — menja se u istom commitu
kao prvi stvarni `education.*` blok.

---

## FAZA 4 — `EducationContent` + Edu Studio

```
EducationContent {
  tenantId          (required, prvi; tenant-first indeksi)
  title, slug
  kind:       advice | article | guide | video | material
  visibility: "public" | "private"   ← TRENUTNA persistencija;
                                        cilj je accessMode (public|gated|private)
  status:     draft | published
  blocks:     ContentBlock[]
  seo?        (samo za public)
}
```

⚠️ Novi model sa `tenantId` **mora** u `tenantScopedModels()` (`src/lib/tenant/deleteTenant.ts:64`) — `deleteTenant.contract.test.ts` skenira `src/models/` i pada dok se ne doda.

**Edu Studio** — `src/app/education/content/`. Puna admin stranica, **ne modal**. Marina počinje od praznog naslova i `[+ Dodaj blok]`, ne od AI modala.

### Implementacioni status F4A + F3B (EDU UI-2) — 2026-08-29

- ✅ `EducationContent` model sa tenant-first indeksima, **tenant-scoped unique
  slug-om** (`{ tenantId, slug }`) i `Mixed` blokovima; nema `clientProfileId`,
  assignment, theme, booking ni course polja — regresioni test to zaključava.
- ✅ Model je u `tenantScopedModels()`; canonical cascade contract je zelen.
- ✅ `/api/education/content` (GET/POST), `/api/education/content/[id]`
  (GET/PATCH/DELETE) i `/api/education/content/[id]/publish` (POST). Svaka ruta
  ide kroz jedan ulaz: admin permission → tenant iz auth konteksta →
  `requireCapability("education.catalog")` → tenant-scoped upit. `tenantId`
  nikada ne dolazi iz tela zahteva; nijedan upit ne koristi samo `_id`.
- ✅ Draft-save koristi `validateContentDocument(blocks, "draft")` — INCOMPLETE
  i HIDDEN prolaze, INVALID daje 422 `CONTENT_VALIDATION_FAILED` bez ijedne DB
  izmene. Blokovi se persistuju tačno onakvi kakve je validator prihvatio.
- ✅ Publish čita **persisted** zapis, ne telo zahteva: nema puta kojim bi se
  objavilo nešto što nije prošlo Save. Host uslov je bar jedan `VALID` vidljiv
  blok; shared validator nije menjan.
- ✅ Lifecycle (**ispravljeno u UI-2B**): jedan zapis nosi **dve kopije**.

  ```text
  root polja        → tekuća radna kopija (menja je Save)
  publishedSnapshot → poslednja objavljena verzija (menja je samo Publish)
  ```

  Ranija formulacija „Save ne menja `status`, dakle nema public downtime-a" je
  bila nedovoljna: `status` jeste ostajao `published`, ali su se menjala baš
  ona root polja (`title`, `slug`, `kind`, `visibility`, `seo`, `blocks`) koja
  bi javna strana čitala — pa bi snimanje bilo **implicitna objava**. Sada
  Save menja samo radnu kopiju, a objava je jedina granica promocije. Nema
  istorije verzija: postoje tačno dve kopije, tekuća i poslednja objavljena.
- ✅ Slug: server normalizuje, izvodi ga iz naslova samo kad nije unet, i
  **ne prepisuje ručno potvrđen slug pri promeni naslova**; kolizija radnog
  slug-a je 409 `EDUCATION_SLUG_TAKEN`. Javni URL je `publishedSnapshot.slug` i
  ostaje živ dok se ne objavi ponovo; dva objavljena zapisa istog tenanta ne
  mogu deliti javni URL (partial unique indeks nad
  `{tenantId, publishedSnapshot.slug}` + provera pri objavi,
  409 `EDUCATION_PUBLIC_SLUG_TAKEN`). Nikad globalno unique.
- ✅ UI: CMS lista (naslov/vrsta/vidljivost/status/izmenjeno) + **full-page**
  editor nad deljenim `ContentBlocksEditor`, `PreviewRenderer` i
  `useContentMediaAuthoring`. Nema education-specific blokova; svih 12 shared
  tipova radi round-trip.
- ✅ **Javni izvor istine (UI-2B, obavezno za UI-3):**

  ```text
  AUTHORING SOURCE  → root EducationContent
  PUBLIC SOURCE     → publishedSnapshot
  PUBLISH           → jedina granica promocije
  ```

  `isPubliclyConsumable()` i `resolvePublicEducationContent()` čitaju
  **isključivo** snapshot. Zapis bez snapshot-a nije javan ni kada mu je
  `status: "published"` — fail-closed, da zatečen zapis pre backfill-a ne
  procuri. UI-3 ne sme koristiti `root.status` + `root.visibility` +
  `root.blocks`. Uslov `visibility === "public"` je **prelazan**: zamenjuje ga
  `accessMode ∈ {public, gated}` uz zaštićeno telo za `gated`.
- ✅ Režim pristupa prati snapshot: prelazak stupa na snagu tek objavom, u oba
  smera. Danas su to dva stanja (`public`/`private`); ciljna tri stanja i
  njihova pravila su u
  [Pristup sadržaju — PUBLIC / GATED / PRIVATE](#pristup-sadržaju--public--gated--private-zaključano-2026-08-29).
- ✅ Backfill: `npm run backfill:education-snapshot -- --dry-run|--apply`
  (tenant-scoped opcija, idempotentan, draft se nikada ne objavljuje). Provereno
  nad `staging-marysoll_db`: kolekcija `educationcontents` još ne postoji, dakle
  nema zatečenih zapisa — skripta ipak postoji jer se na „verovatno prazna baza"
  ne oslanjamo.
- ✅ Admin oznaka: `Draft` · `Objavljeno` · `Objavljeno · neobjavljene izmene`,
  računata iz `workingSavedAt` vs `publishedSnapshot.publishedAt` — bez
  poređenja blokova u renderu.
- ⬜ Nije rađeno u UI-2/2B: javno `/edukacija`, public/client read API, Moj
  Prostor, assignment/ACL, Unpublish, istorija verzija, AI SEO.

---

## FAZA 4B — `EducationOffering` + `EducationInquiry`

Preuzeto iz starog Slice 11, koji se inače gubio pri razlaganju Education luka.
Faza 0 rezerviše `/education/offerings` i `/education/inquiries`, ali modele
niko nije implementirao — ovo je ta faza.

```
EducationOffering { tenantId, title, slug, format, duration?, price?, status }
EducationInquiry  { tenantId, offeringId, clientProfileId?, contact, message,
                    status: new|contacted|converted|closed }
```

⚠️ **`EducationInquiry` NIJE booking.** Nema availability, nema hold, nema
rezervacije termina. To je upit koji Marina ručno obrađuje — isti princip kao
`GuidedProgram` u Fazi 9. Pravi tok „izaberi → availability → booking → intake"
pripada Consultation/Booking luku (Slice 7–10), ne ovome.

`EducationInquiry` sme, ali ne mora, imati `clientProfileId` — upit može stići i
od posetioca koji još nije klijent. Kad postoji, mora se zvati `clientProfileId`.

**Capability:** `education.inquiries` (već registrovan, `platformAvailable:false`),
odvojen od `education.catalog` — tenant sme objaviti ponudu pre nego što ima
obradu upita.

⚠️ Oba modela nose `tenantId` → **moraju** u `tenantScopedModels()`.

**Tek ovde** `content.featured-education` i `content.professional-path` prestaju
da budu `content.*` teaseri i postaju `education.*` blokovi sa loaderom nad
`EducationOffering` i `capability: "education.catalog"` — kako `definitions.ts`
i `docs/TODO.md` („Tvrde granice") već predviđaju.

**Redosled prema Fazi 4:** `EducationContent` je Marinin prvi potreban proizvod
(sadržaj), pa 4 ide prva. 4B sme i posle Faze 5 ako je prioritet brže pustiti
javnu edukaciju.

---

## Pristup sadržaju — PUBLIC / GATED / PRIVATE (zaključano 2026-08-29)

> **Ovo je kanonski ugovor pristupa Education sadržaju.** Svaki drugi dokument
> koji govori o javnom/privatnom Education sadržaju podređen je ovoj sekciji.
>
> **Status (ažurirano):** semantika je zaključana **i implementirana**.
> Persistencija nosi `accessMode: "public" | "gated" | "private"` na radnoj
> kopiji i na objavljenoj verziji, uz `publicPreview` za zaključan sadržaj.
> Zatečeno `visibility` ostaje samo kao izvor za čitanje starih zapisa
> (`resolveAccessMode()`), a `npm run backfill:education-access` ga prevodi.
> Entitlement (pretplata / kupovina / ručno odobrenje) i dalje **ne postoji**.

### Zašto tri stanja, a ne dva

Dva stanja mešaju dva različita pitanja u jedno polje: *da li svet sme da zna da
ovo postoji* i *da li svet sme da pročita telo*. Čim Marina poželi da naplati
ili uslovi pristup vrednom članku, ta dva pitanja se razilaze — sadržaj treba da
bude **otkriven, a zaključan**. To dvostepeno stanje u dvočlanom modelu ne
postoji.

```text
PUBLIC          GATED                         PRIVATE
besplatno       javno otkriveno,              neotkriveno,
i javno         telo zaključano               samo autorizovan korisnik
```

**OTKRIVEN ALI ZAKLJUČAN ≠ PRIVATAN.** To je cela poenta razlike.

### PUBLIC

- postojanje je javno; metapodaci su javni; **telo je javno**
- pojavljuje se u `/edukacija` listi
- indeksira se po uobičajenoj javnoj SEO politici
- javna detaljna ruta vraća pun objavljen snapshot

### GATED

- postojanje je **namerno** javno i pretraživo
- javni pregled je dozvoljen: naslov, kratak opis, opciono cover
- **telo (blokovi) NIJE javno čitljivo**
- javna ruta prikazuje pregled + CTA za pristup
- pojavljuje se u listi ako tako odluči product dizajn
- neautorizovan čitalac **nikada** ne dobija zaštićene blokove — ni u HTML-u, ni
  u RSC payload-u, ni u JSON-u
- SEO: sme biti indeksiran, ali se indeksira **samo javni pregled**

### PRIVATE

- postojanje **nije** javno
- nema javne liste, teaser-a, naslova ni cover-a
- neautorizovan direktan URL vraća **404**, ne „nemate pristup"
- vidljiv je kasnije samo kroz eksplicitnu dodelu / entitlement

### Superseded: „gate samo ako je adresa nekad bila javna"

U razgovoru pre ovog ugovora razmatrano je međurešenje: kada javni sadržaj
pređe u privatan, njegov URL prikazuje gate umesto 404 — ali samo ako je ta
adresa nekada bila javna, da gate ne postane orakl za pogađanje privatnih
adresa.

**To pravilo je prevaziđeno i ne sme se implementirati.** Nikada nije ušlo u
kod ni u dokumentaciju; ovde se beleži da ne bi bilo iskopano kasnije kao
„ranije dogovoreno".

Zamenjuje ga jasnija odluka, jer je ionako rešavala pogrešan problem:

```text
želim da zaključam sadržaj, ali da se i dalje zna da postoji  → GATED
želim da sadržaj više ne bude javno otkriven                  → PRIVATE (404)
```

**Očekivana upotreba (product zapažanje, ne tehničko ograničenje):** ono što je
jednom bilo javno u praksi neće postati privatno — postaće **premium**, tj.
`gated`. Privatan sadržaj tenanti prave **od nule, za konkretnu klijentkinju**.

```text
PUBLIC → GATED     glavni tok · članak je prerađen i sada ima veću vrednost
PRIVATE            autorski od nule, za jednu klijentkinju
PUBLIC → PRIVATE   podržano, ali ivični slučaj
```

Zato `PUBLIC → PRIVATE` ostaje podržan i ispravno definisan, ali se ne
optimizuje: CMS ne treba da ga gura kao ravnopravan izbor, a ponašanja koja iz
njega slede (npr. kartica „više nije dostupno" u `Mojim sadržajima`) su rubna
zaštita, ne glavni tok.

Dakle: **gate pripada GATED stanju, PRIVATE nikada nema javni gate.** Vlasnica
bira ishod eksplicitno, umesto da ga platforma pogađa iz istorije adrese.

### Trenutno stanje vs cilj

| | Stanje u kodu | Ostaje otvoreno |
|---|---|---|
| Polje | ✅ `accessMode: "public" \| "gated" \| "private"` | — |
| Javni upit | ✅ snapshot postoji + `accessMode ∈ {public, gated}` | — |
| Telo | ✅ javno samo za `public`; `gated` ga ne dobija uopšte | pristup uz entitlement |
| Javni pregled | ✅ `publicPreview` na radnoj kopiji i snapshot-u | — |
| Gate strana | ✅ pregled + kontakt kanali tenanta | „Zatraži pristup" kao zapis |
| Lifecycle | ✅ radna kopija + `publishedSnapshot`, prelaz tek objavom | — |

**Preporučeni naziv je `accessMode`, ne `visibility`.** `visibility` postaje
netačan čim GATED postoji: takav sadržaj **jeste** vidljiv, ali mu telo nije
dostupno. Migracija se izvodi u implementacionom tasku, ne ovde.

Zabranjeni nazivi u domenu sadržaja: `isPaid`, `subscriberOnly`, `premium`,
`vip`, `membersOnly`. To su mehanike naplate, ne semantika pristupa — vidi
„Entitlement" niže.

### Javni pregled (`publicPreview`) za GATED

GATED sadržaj mora imati **eksplicitan** javni pregled:

```text
publicPreview {
  title
  description?
  coverImage?
}
```

Ovo su javni podaci i tako se tretiraju. Tvrda pravila:

- **nikad** ne izvoditi teaser iz zaštićenog tela u trenutku zahteva
- **nikad** ne slati `ContentBlock[]` neautorizovanom čitaocu
- **nikad** ne izlagati imena fajlova, download adrese ni media iz tela
- pregled je eksplicitno sačuvan i objavljen kao javni metapodatak

Kada **već javan** sadržaj prelazi u GATED, pregled se sme zasejati iz onoga što
je **ranije već bilo javno**: poslednji javni naslov, javni SEO opis, javni
cover. Ne prenosi se: blokovi članka, download adrese, interni metapodaci, novi
privatni naslov, nesačuvana radna kopija.

Sadržaj koji je GATED od prvog dana traži da vlasnica pregled definiše sama.

### Odnos prema objavljenoj verziji (UI-2B ostaje na snazi)

```text
root EducationContent  → radna kopija (menja je Save)
publishedSnapshot      → objavljena verzija (menja je samo Publish)
```

Javni read authority čita **objavljeno** stanje pristupa i objavljeni javni
pregled, nikada nesačuvanu radnu kopiju. Buduća objavljena verzija zato nosi i
`accessMode` i `publicPreview`.

Posledica koja se ne sme prekršiti:

```text
Save     → ne menja živi režim pristupa
Publish  → promoviše režim pristupa + telo + javni pregled u živo stanje
```

Svaki prelaz — `PUBLIC → GATED`, `GATED → PRIVATE`, `PRIVATE → PUBLIC` —
stupa na snagu **isključivo objavom**.

### Ponašanje ruta i istorija adresa

```text
tekući PUBLIC/GATED slug        → ruta se javno razrešava
PRIVATE                         → ruta ne sme potvrditi postojanje (404)

PUBLIC slug A → PUBLIC slug B   → A sme 301 na B
GATED slug A → GATED slug B     → A sme 301 na B

PUBLIC → GATED                  → ista ruta, umesto tela ide javni pregled + CTA
GATED → PUBLIC                  → ista ruta, telo posle eksplicitne objave

PUBLIC/GATED → PRIVATE          → 404 za neautorizovanog
                                → BEZ redirekcije na novi slug
                                → bez ijednog signala da zapis još postoji

PRIVATE → PUBLIC/GATED          → javno se razrešava tek posle objave
DELETE                          → 404
```

**Istorija adresa se nikada ne sme koristiti kao orakl za privatan sadržaj.**
301 postoji da sačuva podeljene i indeksirane linkove između dva javno
otkrivena stanja, ne da otkrije da nešto postoji.

Implementacija (UI-3A.2): `publishedSlugHistory` na zapisu, u koju ulazi samo
adresa koja je **stvarno bila javno objavljena** — slug iz radne kopije koji
nikad nije objavljen nema javni URL, pa za njega ne sme postojati preusmerenje.
Razrešavanje ide tačnim redosledom:

```text
1. kanonska adresa objavljene verzije   → sadržaj
2. ranija javna adresa istog zapisa     → trajno preusmerenje na kanonsku
3. sve ostalo                           → 404
```

Zabrana se odnosi na **razrešavanje**, ne na čuvanje: zapis sme zadržati svoju
raniju javnu adresu i dok je privatan, ali je resolver tada ne razrešava — i
kanonska i stara adresa vraćaju 404. Zahvaljujući tome, povratak iz privatnog u
javno oživljava ranije podeljene linkove umesto da ih trajno pokida.

Stara adresa je zauzeta i za druge zapise: objava koja bi preuzela tuđ alias
odbija se sa `EDUCATION_PUBLIC_SLUG_TAKEN`, da drugi tekst ne pokupi tuđ link i
njegov SEO signal.

Napomena o statusu: Next app router ne može da postavi 301 iz same strane, pa
se koristi `permanentRedirect()` (**308**). Za pretraživače je ekvivalentno
trajno preusmerenje; 301 ostaje moguć samo iz proxy sloja, koji za ovo ne bi
smeo da radi upit u bazu.

### Javna lista `/edukacija` (odluka: lista je javna, ne personalizovana)

```text
PUBLIC   → pojavljuje se, pun pristup
GATED    → pojavljuje se, sa javnim pregledom i jasnom oznakom zaključanog pristupa
PRIVATE  → nikada se ne pojavljuje — ni prijavljenoj klijentkinji koja ima pristup
```

Upit **ne sme** biti samo `status=published`. Konceptualno:

```text
publishedSnapshot postoji
AND accessMode ∈ ["public", "gated"]
```

**`/edukacija` je čisto javna površina i identična je za svakog posetioca.**
Razmatrana je i personalizovana lista, u kojoj bi prijavljena klijentkinja u
istom spisku videla i svoje privatne materijale. Odbijena je namerno:

- lista bi se morala renderovati po posetiocu i **ne bi smela da se keširа**;
- svaka greška u personalizaciji bi curila privatan sadržaj na javnoj ruti;
- fail-closed je jači kada javni upit **strukturno ne može** da dohvati
  `private` zapis, umesto da ga dohvata pa filtrira po posetiocu.

Privatan sadržaj zato živi isključivo u autorizovanom prostoru klijentkinje
(`Moj Prostor` → **`Moji sadržaji`**, Faza 6A/6B):

```text
/edukacija            javne + gated preview · isto za svakoga · keširano
/panel/moj-prostor    → Moji sadržaji
                        · dodeljeno (Marina napravila/odobrila za nju)
                        · sačuvano (sama dodala sa javne edukacije)
```

Postoji i **proizvodni** razlog, ne samo bezbednosni: materijal napravljen baš
za jednu klijentkinju treba da izgleda kao njen. Da se pojavi u javnom spisku,
ona bi razumno pretpostavila da ga svi vide — i time bi izgubila ono zbog čega
takav materijal ima vrednost.

**Entitlement se ne razrešava u listi, nego na detaljnoj ruti.** Lista prikazuje
isti `gated` pregled svima, uključujući klijentkinju koja ima odobrenje; telo
dobija tek kada otvori sadržaj. Time lista ostaje bez ijedne per-viewer grane, a
provera prava ostaje na jednom mestu.

Poznata posledica za UX, koju treba rešiti u UI-3B/6A: klijentkinja gleda **dva
mesta**. Navigacija mora da ih premosti (iz `Moj Prostor` ka javnoj edukaciji i
obrnuto), inače deluje kao da joj sadržaj nedostaje.

### GATED detaljna strana — verzija 1

Danas ne postoje: pretplata, plaćeni pristup, pojedinačna kupovina, model
zahteva za pristup, UI za ručno odobrenje, entitlement resolver. Zato prva
verzija **ne sme** tvrditi da postoje.

```text
NASLOV    <javni naslov iz pregleda>
OPIS      <eksplicitan javni teaser>
PORUKA    „Ovaj sadržaj nije javno dostupan."
          ili „Ovaj sadržaj je dostupan uz odobrenje."
CTA       „Zatraži pristup" / „Kontaktirajte nas"
          → postojeći javni kontakt kanali tenanta
```

Zabranjeno dok sistemi ne postoje: „Pretplatite se", „Kupite", „Premium",
„Članovi", „Vaša pretplata".

### Entitlement — ko sme da pročita zaključano telo

Pretplata, pojedinačna kupovina i ručno odobrenje **nisu četvrti tip sadržaja.**
To su različiti načini da korisnik stekne pravo prolaza kroz GATED (ili
autorizovan PRIVATE) sadržaj.

```text
accessMode   = šta javnost sme da otkrije
entitlement  = sme li OVAJ prijavljeni korisnik da pročita zaštićeno telo
```

Konceptualno, kasnije:

```text
canReadProtectedEducationContent =
  ručno odobrenje
  OR aktivna pretplata
  OR pojedinačna kupovina
```

To je isti obrazac koji Marysoll već koristi prema svojim tenantima: plan
otključava funkcionalnost automatski, a superadmin sme ručno da odobri pristup
i bez plaćanja. Marina dobija isti oblik moći nad svojim sadržajem.

**Mehanika naplate se ne kodira u `accessMode`.** Jedan zapis, jedno stanje
pristupa, više mogućih izvora prava.

### Ručni izuzetak — zašto je razdvajanje neophodno

Marina ima GATED članak visoke vrednosti. Redovna klijentkinja sa konsultacija
sme da dobije pristup **iako nema pretplatu i nije ga kupila.**

Ishod: `EducationContent` ostaje **jedan zapis**; pristup dolazi iz odobrenja.
Članak se **ne duplira** u privatnu kopiju. Bez razdvajanja `accessMode` i
entitlement-a, ovaj scenario neizbežno vodi u duplikate sadržaja.

### Odnos prema F6B (dodela i ACL)

F6B postaje **prvi konkretan sloj zaštićenog pristupa**, ali dva pojma ostaju
razdvojena i u dokumentaciji i u budućem modelu:

```text
DODELA (assignment)  = ovaj sadržaj je relevantan/dodeljen ovoj klijentkinji
ENTITLEMENT          = ova klijentkinja sme da pročita zaštićeno telo
```

Prva implementacija sme namerno koristiti dodelu kao ručno odobrenje, ali se
**ne sme pretpostaviti da su ta dva pojma zauvek isto** — pretplata i kupovina
kasnije daju pravo bez ijedne pojedinačne dodele.

### Odnos prema `EducationInquiry`

`EducationInquiry` je poslovni upit, **nije** ACL, nije pretplata, nije
entitlement. Za prvu verziju CTA **ne mora** da kreira nikakav zapis — postojeći
javni kontakt kanali su dovoljni. Da li „Zatraži pristup" kasnije pravi
`EducationInquiry` ili zaseban access-request zapis, odlučuje kasniji product
rez.

### Bezbednost: token nije dozvola

Buduće čitanje zaštićenog sadržaja **ne sme** da se oslanja na dugovečnu tvrdnju
u tokenu tipa „ovaj korisnik sme da čita sadržaj X". Token nosi identitet i
odnos prema tenantu; **pravo pristupa se proverava na serveru pri svakom
zahtevu.**

Ukidanje odobrenja ili isteklu pretplatu mora odmah zaustaviti buduća čitanja,
čak i kada u pregledaču i dalje stoji važeći login token.

### Bezbednost: zaštićena media

Za stvarno zaštićene fajlove (gated/private materijali):

- ne oslanjati se na trajne javne provider adrese
- zaštićeno preuzimanje kasnije traži autorizaciju + kratkotrajnu/potpisanu
  isporuku ili ekvivalentan mehanizam

Zatečeno javno Cloudinary ponašanje **nije automatski dovoljno** za plaćene i
privatne materijale.

Ograničenje koje treba reći naglas: ako je resurs ranije bio javan i neko ga je
već preuzeo ili kopirao, Marysoll tu kopiju ne može povući. Platforma garantuje
samo da **budući serverski zahtevi** više ne otkrivaju zaštićeni sadržaj.

To nije razlog da se naknadno zaključavanje spreči ili otežava. `PUBLIC → GATED`
je legitiman i očekivan potez vlasnice, tipično kada članak bitno preradi i
unapredi — inače zaključavanje ne bi ni imalo svrhu. Platforma obezbeđuje da
odluka bude moguća, jasna i primenjena od trenutka objave; ne pretvara se u
DRM.

### Arhitektonski položaj

```text
TENANT
  → WORKSPACE
      → EducationContent
              ↓
          accessMode
              ↓
     public / gated / private
```

`PRESENTATION` (tema) odlučuje **kako** dozvoljena površina izgleda.
`ENTITLEMENT` odlučuje **ko** sme da pročita zaštićeno telo.
**Tema nikada nije autoritet pristupa.**

### Terminologija — zaključano

| Pojam | Značenje |
|---|---|
| **Workspace activation** | tenant dobija Education capability/workspace |
| **Capability gate** | sme li tenant uopšte da koristi Education domen |
| **Content access mode** | `public` / `gated` / `private` — šta javnost sme da otkrije |
| **Content gate** | sme li posetilac/korisnik da pročita telo ovog zapisa |
| **Dodela (assignment)** | Marina je taj sadržaj namenila konkretnoj klijentkinji |
| **Sačuvano (saved)** | klijentkinja je sama dodala sadržaj u svoj prostor |
| **Entitlement / odobrenje** | zašto konkretan prijavljen korisnik sme da čita zaštićeno |
| **Public preview** | namerno javni metapodaci GATED sadržaja |

Reč „gate" se **ne koristi sama** — uvek se kaže koji gate.

### Primeri

**A — besplatan članak.** „Osnove nege kože", `public` → `/edukacija/osnove-nege-koze`,
pun članak.

**B — GATED članak visoke vrednosti.** „Napredna analiza sastojaka", `gated`, sa
javnim pregledom (naslov, kratak opis, cover). Javnost ga otkriva, telo je
skriveno, CTA je „Zatraži pristup". Kasnije isti zapis otključavaju pretplata,
kupovina ili ručno odobrenje.

**C — privatan klijentski materijal.** „Plan nakon konsultacije", `private` →
nikad u listi, pogođen URL vraća 404, kasnije ga dodeljena klijentkinja vidi u
svom autorizovanom prostoru.

**D — javno postaje GATED.** Radna kopija: `accessMode = gated` + eksplicitno
odobren javni pregled. `Save` → živo ostaje javno. `Publish` → ruta ostaje
otkrivena, telo postaje zaključano, prikazuju se teaser i CTA.

**E — javno postaje PRIVATE.** Radna kopija: `accessMode = private`. `Save` →
živo ostaje javno. `Publish` → nestaje iz javne liste, neautorizovana ruta vraća
404.

### Šta ovaj ugovor NE odlučuje

Model pretplate, model kupovine, tok plaćanja, model ručnog odobrenja, model
zahteva za pristup, potpisivanje zaštićene media, UI-3 rute, gate komponenta,
javni loader, ACL, `Moj Prostor` — sve ostaje implementacionim rezovima.

Komercijalna pravila su **potpuno** van ovog dokumenta: koji Marysoll plan
uključuje plaćenu edukaciju, podela prihoda, cena pretplate, cena pojedinačnog
pristupa, povraćaji, Paddle integracija.

---

## FAZA 5 — Javno `/edukacija` → **release gate**

- `src/app/tenant/edukacija/page.tsx` i `[...slug]/page.tsx` (catch-all, kao `/blogs`)
- `"/edukacija"` u `CLIENT_TENANT_PATHS` (`src/lib/proxy/pipeline/routing.ts:35`) — proxy proverava i `startsWith(p + "/")`, pa **jedan unos pokriva i `[slug]`**
- `src/app/sitemap.ts` — dodati u `tenantRoutes`
- Navigacija (**ispravljeno 2026-08-30**): raniji plan je bio da „Edukacija" samo
  pređe sa `/blogs` na `/edukacija`. To je prevaziđeno odlukom o **dva nezavisna
  kanala** — vidi red „Blog i Edukacija" u zaključanim odlukama:

  ```text
  Blog       → /blogs        kada blog površina ima objavljen sadržaj
  Edukacija  → /edukacija    kada je education.catalog razrešen
                             i /edukacija ima objavljen javan sadržaj
  oba        → obe stavke;   nijedan → nijedna stavka
  ```

  Fallback `Edukacija → /blogs` se uklanja i ne sme se vraćati.

  ⚠️ `LatestEducation.tsx` je **izuzetak i ostaje na `/blogs`**: taj blok se puni
  iz `content.blog` loadera, dakle iz `NewsletterCampaign` postova. Preusmeriti
  ga na `/edukacija/<slug>` značilo bi linkovati blog slugove na Education rutu —
  404 na svaki klik, i mešanje dva storage-a koje ugovor izričito zabranjuje.
  Ekvivalentan blok koji se puni iz `EducationContent`-a je poseban posao
  (UI-3B), ne preusmeravanje ovog.
- Tenant bez capability-ja → `notFound()`, po uzoru na `resolveThemePage()`

⚠️ **theme-9 nema svoju prezentaciju za listu/članak.** `/blogs` na theme-9 pada na generički beli `src/components/tenant/BlogsPageClient.tsx` koji nema veze sa Expert Editorial. `/edukacija` traži theme-9-native prikaz — **dizajnerski posao, ne samo ruta**.

⚠️ **`/blogs` ostaje netaknut** — i za Edu centre.

### RELEASE GATE (kraj Faze 5) — ISPRAVLJENO 2026-08-29

Ranija formulacija je vezivala „Aktiviraj Edu Centar" za ovaj gate. To više
nije tačno: EDU UI-1A je aktivaciju svesno pomerio ranije, kao **admin
workspace activation**. Dve odluke su sada odvojene:

```text
ADMIN WORKSPACE ACTIVATION            PUBLIC EDUCATION RELEASE
→ F3A / EDU UI-1A                     → UI-3 / F5
→ sme postojati PRE javnog surface-a  → traži EducationContent + public
→ staging/release kontrolisano           loader/rute/readiness
```

F5 **više ne kontroliše postojanje Edu admin workspace-a.** F5 je release gate
za **javni** Education surface:

```
✓ EducationContent postoji     ✓ public loader postoji
✓ /edukacija ruta postoji      ✓ readiness provider radi
✓ theme-9-native prikaz        ✓ javni upit traži tenantId + objavljen snapshot
                                  + accessMode ∈ {public, gated}
        ↓
javni /edukacija se pušta
```

Produkciona izloženost aktivacionog CTA-a i javni `/edukacija` release ostaju
**zasebne release odluke**; nijedna ne blokira drugu.

Vidi i zaključano platformsko pravilo
[Tenant → Workspace → Presentation](ARCHITECTURAL_RULES.md#33-tenant--workspace--presentation-zaključano-2026-08-29):
workspace sme postojati pre nego što taj vertikal ima ijednu javnu
prezentaciju.

---

## FAZA 6A — Client Workspace foundation

**Read/orchestration sloj, ne CRM.** Mora doći **pre** Guide-a i Programa: oba su po definiciji client-centric, pa bi bez ovoga Marina birala klijentkinju posebno u Guide editoru, posebno u programu, posebno u edukaciji — i taj navigation flow bi se kasnije bacao.

```
admin                                   klijent
/dashboard?tab=klijenti                 /panel?tab=Moj Prostor
      ↓                                       ↓
/dashboard/klijenti/[clientProfileId]   ista domenska projekcija,
                                        client-visible
Pregled · Termini · Edukacija
· (kasnije Guide) · (kasnije Program) · Istorija
```

Sadržaj se sklapa **po capability-jima tenanta i stvarnim podacima klijenta**: čist salon nema Edu sekciju, čist Edu tenant nema Salon sekciju, hibrid ima obe. Salon klijent ne gleda praznu „Edukaciju".

**`Moj Prostor`** — nov tab u `PANEL_TABS` (`src/layout/ClientPanelLayout.tsx`), telo kroz `next/dynamic({ssr:false})` kao ostali. `Moj Profil` ostaje samo identitet/podešavanja. Pod-rute ispod `/panel/…`; `"/panel"` je već u `CLIENT_TENANT_PATHS` → **nula izmena u proxy-ju**.

⚠️ Sve privatne strane: `export const metadata = { robots: { index:false, follow:false } }` (presedan `src/app/tenant/panel/page.tsx`), van sitemap-a, prefiks u `DISALLOWED_PATHS` (`src/lib/seo/robotsRules.ts`).

### Adapteri u `Moj Prostor`

`Moj Prostor` nije Education ekran — to je mesto gde klijent vidi **odnos sa tim
biznisom kroz vreme**. Za salon: termini, nagrade, preporuke. Za Marinu:
edukacija, vodiči, program, konsultacije. Za hibrid: sve zajedno.

| adapter | stanje |
|---|---|
| `Appointment` | ✅ podaci postoje (`clientProfileId`, tenant-first indeks) |
| `Testimonial` / Preporuke | ✅ podaci postoje (`clientProfileId`) |
| **Loyalty** | ✅ **podaci I ekran postoje** — jedan od prvih adaptera |
| **`Moji sadržaji`** (dodeljeno + sačuvano) | → Faza 6B |
| Education (assignment) | → Faza 6B |
| SkincareGuide | → Faza 8 |
| GuidedProgram | → Faza 9 |
| Intake | → stari Slice 9 |

**Loyalty je najjeftiniji prvi adapter.** Klijentski panel već ima tab „Nagrade"
(`PANEL_TABS`), sidebar ga prikazuje kad program teče ili kad klijent ima
istoriju (`showLoyaltyTab`), i postoji pet gotovih ruta:
`/api/loyalty/client/{me,ledger,vouchers,moments,share-voucher}`. Nedostaje samo
da Loyalty postane deo jedinstvenog pregleda umesto izolovanog taba:

```
MOJE NAGRADE
❤️ 4 srca    ⭐ 120 poena
Još 1 srce do sledeće nagrade
Dostupno: 15% popusta · važi do …
[ Iskoristi / Pogledaj nagrade ]

ISTORIJA
+2 poena   Dolazak na termin
+1 srce    24. avgust
-50 poena  Iskorišćena nagrada
```

⚠️ **`Moj Prostor` ne postaje novi Loyalty Engine** — samo čita postojeće
podatke. Zaseban „Nagrade" ekran u početku ostaje kao detaljna stranica na koju
vodi CTA; da li uopšte treba da ostane top-level tab odlučuje se kasnije, iz
upotrebe.

### `Moji sadržaji` — dva različita izvora, jedna sekcija

`Moj Prostor` dobija sekciju **`Moji sadržaji`**, i u nju se stiže na dva
načina koja se **ne smeju stopiti u jedan pojam**:

```text
DODELJENO   Marina je materijal namenila baš toj klijentkinji
            → pravi ga/odobrava Marina · Marina ga i povlači
            → jedini put kojim `private` sadržaj uopšte stiže do klijenta

SAČUVANO    klijentkinja je sama dodala sadržaj sa javne edukacije
            → pravi ga i briše klijentkinja
            → dugme „+" na svakom sadržaju u listi i na detaljnoj strani
```

**Tvrdo pravilo: čuvanje NIKADA ne daje pristup.** Dugme „+" pravi referencu u
klijentkinjinom prostoru, ništa više. Sačuvan `gated` sadržaj u `Mojim
sadržajima` i dalje stoji zaključan, sa istim CTA za pristup — kao obeleživač,
ne kao otključavanje. Bez ovog pravila „+" postaje rupa u entitlement-u.

Iz toga slede tri odvojena pojma koja se lako pomešaju:

```text
sačuvano     → gde se sadržaj pojavljuje kod klijentkinje
dodeljeno    → Marina je odlučila da je materijal za nju
entitlement  → sme li da pročita zaštićeno telo
```

Dodela sme biti izvor entitlement-a (ručno odobrenje). Čuvanje nije nikada.

Praktične posledice:

- „+" na sadržaju koji posetilac gleda **neprijavljen** vodi na prijavu, ne pravi
  tihi zapis;
- isti sadržaj sme biti i dodeljen i sačuvan — sekcija to prikazuje kao jedan
  unos, a ne dva;
- „+" se pojavljuje samo nad sadržajem koji je klijentkinji vidljiv, dakle nad
  `public` i `gated`; `private` do nje ionako stiže samo dodelom.

Ovo ujedno zatvara veći deo ranije zabeleženog „klijentkinja gleda dva mesta":
„+" je most sa javne edukacije ka njenom prostoru.

### Sačuvan sadržaj koji više nije dostupan (zaključano)

Kada Marina zaključa ili skloni sadržaj koji je klijentkinja ranije sačuvala,
unos se **ne briše tiho**. Ostaje kao prazna kartica sa jasnim stanjem i
akcijom, jer je najgore moguće ponašanje da joj sadržaj nestane bez objašnjenja:

```text
┌──────────────────────────────────────────┐
│  <naslov koji je ona sačuvala>           │
│  Ovaj sadržaj više nije dostupan.        │
│                                          │
│  [ Zatraži pristup ]   [ Ukloni ]        │
└──────────────────────────────────────────┘
```

Akcija zavisi od novog stanja, i tu se `gated` i `private` **ne izjednačavaju**:

```text
postao GATED     → zaključan pregled + put ka pristupu
                   (danas: zatraži pristup · kasnije: pretplata/kupovina)
postao PRIVATE   → samo „Zatraži pristup" (kontakt) — kupovina ne postoji za
                   private; Marina odlučuje ručnim odobrenjem
obrisan          → samo „Ukloni"
```

Uvek postoji **„Ukloni iz Mog prostora"**, da joj sekcija ne ostane zatrpana
sadržajem koji joj više ništa ne znači.

Dve granice koje ova kartica ne sme da pređe:

- prikazuje **naslov koji je ona sačuvala**, nikada novi, izmenjeni privatni
  naslov — isto pravilo kao za javni pregled: novouređeni privatni metapodaci se
  ne iznose;
- postoji samo u **njenom autorizovanom prostoru**, za sadržaj koji je sama
  sačuvala. Nikada na javnoj ruti — inače bi to bio upravo onaj orakl koji
  `private` treba da spreči.

**Zašto ovo nije bezbednosni ustupak.** Ona je taj sadržaj već videla dok je bio
javan, možda ga i preuzela ili podelila — kartica joj ne otkriva ništa novo.
Naknadno zaključavanje ionako nije mehanizam za povlačenje već iznetog: kao što
stoji u ugovoru pristupa, platforma garantuje samo da **budući** zahtevi ne
otkrivaju zaštićeno. U praksi Marina to i radi kada članak bitno preradi i
unapredi — inače zaključavanje nema svrhu. Naš posao je da ta odluka bude
moguća i jasna, ne da je sprečimo.

Guide i Program kasnije samo **dodaju adaptere** u ovaj workspace.

---

## FAZA 6B — Dodela sadržaja i ACL

**Dodela je nezavisna od režima pristupa** — Marina mora moći da napiše javnu edukaciju i istovremeno je dodeli Jeleni kao „Preporučeno za vas", bez dupliranja članka.

Matrica prema ciljnom modelu iz
[Pristup sadržaju](#pristup-sadržaju--public--gated--private-zaključano-2026-08-29)
(danas u kodu postoje samo redovi `public` i `private`):

| accessMode | dodela / odobrenje | rezultat |
|---|---|---|
| `public` | nema | običan javni članak |
| `public` | ima | javni članak **+** u `Moj Prostor` te klijentkinje |
| `gated` | nema | javno otkriven, telo zaključano, CTA za pristup |
| `gated` | ima | javno otkriven **+** telo dostupno toj klijentkinji |
| `private` | ima | samo dodeljene klijentkinje; za ostale 404 |
| `private` | nema | niko od klijenata |

Dodela je **jedan od izvora** prava pristupa, ne jedini — pretplata i kupovina
kasnije daju isto pravo bez pojedinačne dodele. Zato dodela i entitlement
ostaju odvojeni pojmovi.

```
ClientContentAssignment {
  tenantId, educationContentId, clientProfileId
  assignedAt, firstViewedAt?, completedAt?, revokedAt?, assignedByProfileId?
}
unique index: { tenantId, educationContentId, clientProfileId }
```

Lifecycle polja nisu luksuz — bez njih se kasnije ne može napraviti **Aktuelno / Istorija** u `Moj Prostor`.

**`ClientContentAssignment` pokriva samo dodelu.** Klijentkinjino sopstveno
čuvanje („+" dugme, vidi Fazu 6A) je zaseban pojam sa drugim vlasnikom i drugim
lifecycle-om: pravi ga i briše klijentkinja, i **nikada** ne nosi pravo čitanja
zaštićenog tela. Da li se to tehnički rešava zasebnim zapisom ili poljem izvora
u istom modelu, odlučuje implementacija Faze 6B — ali pojmovi se u ugovoru ne
smeju izjednačiti, jer bi tada „+" postao tihi grant.

**ACL obrazac, doslovno kao `src/app/api/appointments/client/[id]/cancel/route.ts`:**

```
getTokenFromRequest → verifyToken
→ traži I tenantId I tenantUserId, inače 401
→ requireCapability(decoded.tenantId, "education.catalog")
→ findOne({ _id, tenantId, clientProfileId })
→ 404 i za nepostojeće i za tuđe (bez ownership orakla)
```

**Nikad** id vlasnika iz URL-a, query-ja ili body-ja.

Prosleđen link se ponaša prema režimu pristupa, i tu se raniji tekst ispravlja —
`private` nikada ne sme reći „Nemate pristup", jer bi time potvrdio da zapis
postoji:

```text
private → 404 (i za nepostojeće i za tuđe, bez ownership orakla)
gated   → javni pregled + CTA za pristup
```

---

## FAZA 7 — Transakciono obaveštenje

Kopirati `createLoyaltyNotification` (`src/lib/loyalty/notifications.ts`) — zvonce + push + email, **nikad ne baca**.

- `Notification.type` je **zatvoren enum** (`src/models/Notification.ts`) — novi tip ide u enum + test
- Push: `sendWebPushToUser(tenantUserId, payload, { requireSettings })`, deep-link kroz `clientPanelPath()`
- Email: purpose **`"notification"`**, ne `"newsletter"`; šablon u `templates/otherTemplates.ts`
- ⚠️ Telo mejla **neutralno**: „Vaš novi Skincare Guide je spreman", nikad „Imate dehidriranu kožu…"

**Ne dirati:** `sendNewsletterEmail`, `sendNewsletterBatch`, `src/lib/newsletter/*`, `AudienceContact`.

---

## FAZA 8 — `SkincareGuide`

### Odluka koja mora pasti PRE implementacije

**Education tenant ≠ automatski SkincareGuide.** `EducationContent` je univerzalni Marysoll Edu domen; SkincareGuide je Marinina konkretna stručna vertikala.

| | opcija |
|---|---|
| **A** | generic `PersonalizedGuide` + skincare template/schema |
| **B** | `SkincareGuide` ostaje poseban domen + poseban capability/readiness |

Trenutno naginjanje: **B** — strukturisana procena kože je vrlo specifična i ne treba je razvodniti u generički JSON „guide". Odluku **ne donositi** u 2B ni u Content Composer fazi.

### Model

`SkincareGuide { tenantId, clientProfileId, version, … }` — **`clientProfileId`**, ne `clientId`.

**Jezgro je strukturisano, ne rich-text.** Fiksna polja: procena stanja · primarni cilj · AM rutina · PM rutina · preporučeni sastojci · trenutno izbegavati · primena · moguće reakcije · šta uraditi ako reaguje · plan praćenja · sledeća kontrola. Slobodni Composer blokovi su **dodatak**, ne zamena.

Razlog: v1→v2 poređenje, „šta se promenilo od prošle kontrole" i PDF renderer traže strukturu. Jedan veliki rich-text blok znači kasnije parsiranje teksta da bi se dobilo ono što je moglo postojati od početka.

**Verzionisanje:** v1/v2/v3 se čuvaju, prethodne se ne gube. **PDF = browser print** po uzoru na `src/lib/diagnostics/exportReport.ts`; dugme **„Sačuvaj / štampaj PDF"** (browser otvara print dijalog, korisnik bira Save as PDF). Pravi jedan-klik `.pdf` traži pravi generator — kasnije, ako zatreba.

**Dodaje adapter** u Client Workspace iz 6A.

**Tražiti od Marine pre implementacije:** kada ona savetuje dalje, a kada upućuje dermatologu/lekaru. Marysoll ne sme sam da odlučuje gde je medicinska granica.

---

## FAZA 9 — `GuidedProgram`

```
GuidedProgram { tenantId, clientProfileId, title, status, steps[] }
ProgramStep   { type: education|consultation|follow_up|task,
                title, description?, educationContentId?, skincareGuideId?,
                scheduledAt?, meeting?{provider,url}, reminder? }
```

⚠️ **`clientProfileId`, ne `clientId`.**

⚠️ **Ne praviti drugi booking sistem.** Marina ručno unosi datum, vreme i Meet/Zoom link **već dogovorenog** termina. Zapis **ne sme** tvrditi da je Marysoll proverio dostupnost ili rezervisao termin.

Kasnije: `BookingReservation → Consultation → ProgramStep`, i datum prestaje da se prepisuje ručno.

**Dodaje adapter** u Client Workspace iz 6A.

---

## FAZA 10 — AI asistencija (poslednja)

Manual-first. AI je alat sa strane: predloži strukturu · nacrt iz ideje · poboljšaj označeni tekst · pravopis · jasnoća · SEO.

- **Uvek Prihvati/Odbaci diff**, nikad tihi overwrite
- **SEO samo za javni sadržaj.** Privatno = `noindex`, van sitemap-a; personalizovana procena **nikad** u OG title/description
- Za Skincare Guide AI **ne sme** sam da zaključuje stanje kože — Marina piše procenu, AI pomaže sa formom

Postoji `generateSeoMetadata()` (domenski neutralan) i dobar proofread prompt u `marketingLandingSeoAgents.ts`. **Ne postoji** rewrite/proofread nad `LandingBlock[]` — nov posao.

---

## Verifikacija

Posle svake faze:

```bash
npx tsc --noEmit          # 0 grešaka
npm test                  # sve prolazi
npm run test:engines      # 5 paketa
npx eslint                # 0 grešaka (32 zatečena warninga, nijedan nov)
npm run build             # prolazi
```

**Regresija Newsletter-a** (posle Faze 1): otvoriti postojeću kampanju, generisati landing, ručno izmeniti blok, sačuvati, objaviti — ponašanje identično zatečenom.

**Ručna bezbednosna provera** (kraj Faze 6B — prava granica):

1. Marina napravi `private` edukaciju i dodeli je klijentu A
2. Prijaviti se kao klijent A → sadržaj se vidi
3. **Kopirati URL, prijaviti se kao klijent B → mora „Nemate pristup"**
4. Odjaviti se, otvoriti isti URL → redirect na login, ne sadržaj
5. `curl` bez tokena → 401; sa tokenom klijenta B → 404
6. Tenant bez `education.catalog` → 403 na API, `notFound()` na javnoj ruti
7. `public` + assignment → vidi se i javno i u `Moj Prostor`; `revokedAt` skida iz `Moj Prostor`
8. `gated` bez odobrenja → javni pregled i CTA, **nikad** blokovi u odgovoru; sa odobrenjem → telo
9. `private` bez odobrenja → 404 (ne „nemate pristup"), nema ga ni u listi ni u sitemap-u

---

## Rizici i zatečeni problemi

| Nalaz | Status |
|---|---|
| `getCampaign.ts` ne filtrira `landingPage.status === "published"` — neobjavljena kampanja dostupna na svom URL-u ako znaš slug | ✅ **ZATVORENO (2026-08-29).** Ispalo je trivijalno: `getCampaign()` sada koristi `publishedBlogFilter()`, koji traži `landingPage.enabled: true` **i** `landingPage.status: "published"`. Vidi `src/lib/server/getCampaign.ts` + `src/lib/tenant/blogPosts.ts` |
| `src/app/api/notifications/route.ts` nema `tenantId` u upitu | Zatečeno; ako Faza 7 dira taj kod, dodati |
| Nulta pokrivenost testovima campaign block sistema | Faza 1.1 postoji upravo zbog toga |
| `/blogs` linkovi nekonzistentni (`/blog/` vs `/blogs/`) | Radi zbog permisivnog `$or`; ne dirati |
| `BLOCK_LABEL` je iscrpni `Record<LandingBlock["type"], string>` | Dobra vest — dodavanje bloka je tipski provereno |

---

## Šta ovaj plan namerno NE radi

- Ne dira Salon dashboard navigaciju (migracija u workspace obrazac je kasniji, zaseban posao)
- Ne implementira „jedan `AuthUser` → više `Tenant`-a" — samo ga zapisuje kao **jedini** ispravan budući put
- Ne uključuje `consultations.catalog` ni `booking.consultations`
- Ne dira Booking Engine niti skida pauzu sa Slice 6
- Ne migrira postojeće kampanje u `EducationContent`
- Ne preimenuje `SalonProfile`
- Ne pravi `HybridSalonEducationTenant` — takav model ne sme da postoji
