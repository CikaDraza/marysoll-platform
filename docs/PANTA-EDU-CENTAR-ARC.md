# PANTA — Edu Centar: workspace arhitektura i Education domen

> **Status:** ZAKLJUČANA ARHITEKTURA, IMPLEMENTACIJA NIJE POČELA.
> Kanonski dokument za Edu luk. Poslednja izmena: 2026-08-26 · `main`
>
> **Faza 0 počinje tek posle završetka i merge-a Slice 2B** (grana
> `product-engines/theme-engine/layout-contract`). Ovaj dokument namerno ne ulazi
> u aktivni 2B implementacioni tok.
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
→ public / assigned      → Client 360 / Moj Prostor  → Newsletter
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
| Capability | **Pun gate**, ali wiring i aktivacija su **razdvojeni** (Faza 3 vs release gate u Fazi 5) |
| Klijentske rute | `Moj Prostor` tab + pod-rute ispod `/panel`; `Moj Profil` ostaje samo identitet/podešavanja |
| Admin rute | `/education/*` kao zaseban workspace; presedan `src/app/marketing/*` |
| Klijenti | **Horizontalni modul**, ne unutar Edu Centra — klijent pripada tenantu, ne modulu |
| „Salon + Edu" u bazi | **NE kao `tenantType`**; postojeće `verticals: ["beauty","education"]` |
| Vlasničko polje | **`clientProfileId`** na svim client-owned modelima |

---

## Gde ovo stoji u odnosu na tekući rad

Poseban, kasniji luk. Tekući aktivni posao je **Slice 2B** na grani `product-engines/theme-engine/layout-contract` (5 commita, nije spojena).

**Dokument sme na `main` odmah. Faza 0 počinje tek posle završetka i merge-a Slice 2B.**

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

---

## FAZA 2 — Novi blokovi i rupe u editoru

**2.1** `VideoBlock` (`provider: youtube|vimeo|upload`), `TableBlock`, `CalloutBlock`, `ChecklistBlock`, `FileDownloadBlock`, `ImageGalleryBlock`. Meet/Zoom **ne ide** u `VideoBlock` — to je događaj, ne edukativni video.

**2.2 Rupe koje Education mora popuniti:** nema dodavanja bloka, nema brisanja bloka, nema uređivanja slika, nema dodavanja sekcije/stavke cenovnika.

**2.3 Zod validacija na upisu.** `NewsletterCampaign.landingPage.layout` je `Schema.Types.Mixed`; save/publish pišu neprovereno. Deljeni sloj preuzima validaciju — najjeftiniji dobitak na ispravnosti u celom zahvatu.

---

## FAZA 3 — Capability **wiring** (bez aktivacije)

`CapabilityReadinessProvider` interfejs postoji (`src/lib/platform/blocks/resolve.ts:46`), ali **nijedna implementacija nije nigde priključena** — `ClientHomePage.tsx:310` ne prosleđuje `readiness`, a `resolve.ts` fail-close-uje na `"unconfigured"`. Svaki blok sa `capability !== null` bio bi **uvek preskočen**.

U ovoj fazi:

- ✅ plan entitlement mapiran (`plan: UNMAPPED` bezuslovno vraća `false`)
- ✅ tenant provisioning
- ✅ server gate-ovi
- ✅ **`EducationReadinessProvider`** napisan i priključen u `ClientHomePage`
- ✅ testovi, uključujući direktan API pristup bez capability-ja → 403

⚠️ **`platformAvailable` ostaje `false`.** Capability ne sme otključati poluzavršen proizvod.

⚠️ `src/lib/platform/blocks/registry.test.ts` tvrdi tačan broj/spisak blokova i da **nijedan domenski blok nema `capability: null`** — menja se u istom commitu kao prvi `education.*` blok.

---

## FAZA 4 — `EducationContent` + Edu Studio

```
EducationContent {
  tenantId          (required, prvi; tenant-first indeksi)
  title, slug
  kind:       advice | article | guide | video | material
  visibility: "public" | "private"
  status:     draft | published
  blocks:     ContentBlock[]
  seo?        (samo za public)
}
```

⚠️ Novi model sa `tenantId` **mora** u `tenantScopedModels()` (`src/lib/tenant/deleteTenant.ts:64`) — `deleteTenant.contract.test.ts` skenira `src/models/` i pada dok se ne doda.

**Edu Studio** — `src/app/education/content/`. Puna admin stranica, **ne modal**. Marina počinje od praznog naslova i `[+ Dodaj blok]`, ne od AI modala.

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

## FAZA 5 — Javno `/edukacija` → **release gate**

- `src/app/tenant/edukacija/page.tsx` i `[...slug]/page.tsx` (catch-all, kao `/blogs`)
- `"/edukacija"` u `CLIENT_TENANT_PATHS` (`src/lib/proxy/pipeline/routing.ts:35`) — proxy proverava i `startsWith(p + "/")`, pa **jedan unos pokriva i `[slug]`**
- `src/app/sitemap.ts` — dodati u `tenantRoutes`
- Preusmeriti hardkodirane linkove: `theme-9/Header.tsx` (`{name:"Edukacija", href: base+"/blogs"}`), `Footer.tsx`, `LatestEducation.tsx`
- Tenant bez capability-ja → `notFound()`, po uzoru na `resolveThemePage()`

⚠️ **theme-9 nema svoju prezentaciju za listu/članak.** `/blogs` na theme-9 pada na generički beli `src/components/tenant/BlogsPageClient.tsx` koji nema veze sa Expert Editorial. `/edukacija` traži theme-9-native prikaz — **dizajnerski posao, ne samo ruta**.

⚠️ **`/blogs` ostaje netaknut** — i za Edu centre.

### RELEASE GATE (kraj Faze 5)

Tek kada je sve ispunjeno:

```
✓ EducationContent postoji     ✓ loader postoji
✓ /edukacija ruta postoji      ✓ readiness provider radi
        ↓
platformAvailable = true
+ Marina tenant enabled
+ „Aktiviraj Edu Centar" dugme se pušta (Faza 0.4)
```

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

Guide i Program kasnije samo **dodaju adaptere** u ovaj workspace.

---

## FAZA 6B — Dodela sadržaja i ACL

**Assignment je nezavisan od `visibility`** — Marina mora moći da napiše javnu edukaciju i istovremeno je dodeli Jeleni kao „Preporučeno za vas", bez dupliranja članka:

| visibility | assignment | rezultat |
|---|---|---|
| `public` | nema | običan javni članak |
| `public` | ima | javni članak **+** u `Moj Prostor` te klijentkinje |
| `private` | ima | samo dodeljene klijentkinje |
| `private` | nema | niko od klijenata |

```
ClientContentAssignment {
  tenantId, educationContentId, clientProfileId
  assignedAt, firstViewedAt?, completedAt?, revokedAt?, assignedByProfileId?
}
unique index: { tenantId, educationContentId, clientProfileId }
```

Lifecycle polja nisu luksuz — bez njih se kasnije ne može napraviti **Aktuelno / Istorija** u `Moj Prostor`.

**ACL obrazac, doslovno kao `src/app/api/appointments/client/[id]/cancel/route.ts`:**

```
getTokenFromRequest → verifyToken
→ traži I tenantId I tenantUserId, inače 401
→ requireCapability(decoded.tenantId, "education.catalog")
→ findOne({ _id, tenantId, clientProfileId })
→ 404 i za nepostojeće i za tuđe (bez ownership orakla)
```

**Nikad** id vlasnika iz URL-a, query-ja ili body-ja. Link se može proslediti — druga osoba dobija „Nemate pristup".

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

---

## Rizici i zatečeni problemi

| Nalaz | Status |
|---|---|
| `getCampaign.ts` ne filtrira `landingPage.status === "published"` — neobjavljena kampanja dostupna na svom URL-u ako znaš slug | Zatečeno. **Zabeležiti, ne popravljati** u ovom luku osim ako ispadne trivijalno |
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
