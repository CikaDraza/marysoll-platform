# PANTA T2 — Theme/Layout Engine granica (odluka 2026-08-16, rev. v0.2)

> Grana: `product-engines/theme-engine/layout-contract`.
> **v0.2 (Architecture Review):** dodati `LayoutDefinition`/`SectionDefinition`
> (bez njih slot contract ne postoji), `schemaVersion` po bloku, invarijante
> immutable published revizija, server-side block loaderi (zabrana waterfall-a) i
> dvostruka politika za nepoznat blok (render skip / publish error).
> T2 iz [ARHITEKTURA-ENGINES.md](../ARHITEKTURA-ENGINES.md), podeljen na
> **T2A (Theme/Layout boundary)** i **T2B (Tenant verticals + capabilities,
> vidi [PANTA-TENANT-VERTICALS-CAPABILITIES.md](PANTA-TENANT-VERTICALS-CAPABILITIES.md))**.
> Okidač: Education vertikala (Marina) — prvi tenant koji nije „salon = usluge + termini".

## 1. Zašto sada

Theme/Layout sloj **nije neutralan**. Danas zna da je Marysoll salon sa uslugama
i terminima. Dok je postojala jedna vertikala to je bilo neprimetno; sa
edukacijom postaje blokada.

Ako sada samo dodamo `educationEnabled`, `educationBookingEnabled`,
`educationPreviewEnabled`, `educationBannerEnabled`, za par meseci imamo isti
dug sa sledećom vertikalom. Zato T2A ne dodaje nijedan novi flag — **uklanja
kategoriju flagova**.

## 2. Zatečeno stanje (provereno u kodu 2026-08-16)

| Mesto | Šta je vezano za vertikalu |
|---|---|
| [`layouts/types.ts`](../src/components/themes/layouts/types.ts) `ThemeLandingProps` | `salon: SalonProfileData`, `services: IService[]`, `testimonials`, `tenantStats`, `salonWithMergedSocial` — domenski tipovi u props-u teme |
| isti fajl | 10 boolean flagova: `heroEnabled`, `aboutEnabled`, `servicesPreviewEnabled`, `appointmentEnabled`, `testimonialsEnabled`, `artistsEnabled`, `galleryEnabled`, `faqEnabled`, `blogEnabled`, `perksEnabled` + `effectiveGalleryVariant` |
| [`ThemeLayout.tsx`](../src/components/themes/ThemeLayout.tsx) l. 90–96 | flagovi se računaju iz `ls.landing.<sekcija>.enabled` i prosleđuju svakoj temi |
| `layouts/ThemeNLanding.tsx` (8 tema) | svaka tema ručno grana `{servicesPreviewEnabled && <ThemeNServices services={…} />}` |
| `LandingStructure` u [`types/index.ts`](../src/types/index.ts) l. 877+ | fiksan union sekcija (hero/about/servicesPreview/appointmentSection/…) sa CMS poljima |

Površina: **175 fajlova, ~1.2 MB** u `src/components/themes/`.

Posledica: nova vertikala danas znači dirati `ThemeLandingProps` + `ThemeLayout`
+ svih 8 tema. To je definicija loše granice.

## 3. Ciljna granica

```
Theme/Layout Engine
        │ ZNA: brand · design tokens · layout · sections · slots ·
        │      responsive rules · block placement · theme versions
        │
        │ NE ZNA: Service · EducationOffering · Campaign ·
        │         Appointment · Lead · Loyalty
        ▼
Feature Block Registry            (application layer)
        ├── services.catalog
        ├── booking.services
        ├── education.catalog
        ├── booking.education
        ├── distribution.banner
        ├── audience.lead_capture
        └── … budući feature-i
```

**Theme određuje GDE i KAKO se nešto prikazuje. Feature/Engine određuje ŠTA to
jeste i kako radi.**

## 4. Theme JSON kontrakt

Engine ne sme da zna nabrajanje tipova blokova — `type` je slobodan string koji
razrešava registry u aplikaciji.

```ts
interface LayoutBlock {
  id: string;
  type: string;          // npr. "education.catalog" — engine ga ne tumači
  schemaVersion: number; // verzija `config` sheme tog bloka
  slot: string;          // mora postojati u SectionDefinition.slots
  config?: unknown;      // validira feature schema, ne engine
}

interface LayoutSection {
  id: string;
  sectionType: string;   // referenca na SectionDefinition
  variant?: string;      // varijanta te definicije
  blocks: LayoutBlock[];
}

interface ThemeDocument {
  version: number;
  layoutDefinitionId: string;   // koji skup SectionDefinition-a važi
  brand: {
    logo?: string;
    colors: Record<string, string>;
    typography: Record<string, unknown>;
  };
  sections: LayoutSection[];
  lifecycle: "draft" | "published" | "archived" | "preview";
}
```

### 4.1 Layout/Section definicije — bez njih slot contract ne postoji

Engine ne može da tvrdi „slot `aside` ne postoji" ako nema gde da pogleda. Zato
uz dokument ide **definicija layout-a**, koju engine takođe vlada:

```ts
interface SectionDefinition {
  sectionType: string;
  variants: Record<string, { slots: SlotDefinition[] }>;
}

interface SlotDefinition {
  name: string;                 // "main" | "aside" | "cta" | …
  maxBlocks?: number;
  accepts?: "any" | string[];   // opciono ograničenje po block `type`
}

interface LayoutDefinition {
  id: string;                   // = ThemeDocument.layoutDefinitionId
  version: number;
  sections: SectionDefinition[];
}
```

`accepts` je **opciono i nije vertikalno znanje** — to je string lista koju
aplikacija puni iz registry-ja; engine je samo poredi.

### 4.2 Invarijante verzionisanja

- `published` i `archived` revizije su **immutable** — nikad se ne menjaju u mestu.
- Izmena objavljene teme = nova `draft` revizija sa `version + 1`.
- `publish` je **atomska zamena aktivne revizije** (stara ide u `archived`), tako
  da posetilac nikad ne vidi polustanje.
- `preview` revizija je vidljiva samo preko preview tokena i nikad ne postaje
  aktivna bez `publish`.
- `version` je monotono rastuć po tenantu; nema „ponovnog korišćenja" broja.

### 4.3 Šta engine validira

| Validira engine | Ne validira engine |
|---|---|
| jedinstvenost `id` unutar dokumenta | `config` sadržaj bloka (feature schema) |
| da `sectionType`/`variant` postoje u `LayoutDefinition` | da li podaci bloka postoje |
| da `slot` postoji u toj varijanti i poštuje `maxBlocks`/`accepts` | poslovna pravila vertikale |
| dozvoljene `lifecycle` prelaze i monotonost `version`-a | capability razrešenje (T2B) |
| da je `schemaVersion` bloka poznat registry-ju (kroz callback) | migraciju v1→v2 config-a |

## 5. Feature Block Registry (u aplikaciji, ne u paketu)

```ts
registerFeatureBlock({
  type: "services.catalog",
  schemaVersion: 1,
  capability: "services.catalog",
  schema: ServicesCatalogSchema,
  loader: loadServicesCatalog,   // server-side, vidi 5.2
  renderer: ServicesCatalogBlock,
});

registerFeatureBlock({
  type: "booking.education",
  schemaVersion: 1,
  capability: "booking.education",
  schema: EducationBookingSchema,
  loader: loadEducationBooking,
  renderer: EducationBookingBlock,
});
```

Registry drži i **migracije config-a** po tipu (`migrate: (config, fromVersion)`),
tako da stari `published` dokument sa `schemaVersion: 1` nastavlja da radi kada
blok pređe na v2 — bez diranja objavljenih revizija (4.2).

Renderer dobija samo svoj `config` i sopstvene podatke (kroz svoj engine/API) —
**ne** kroz `ThemeLandingProps`. Blok bez razrešene capability se ne renderuje
(vidi T2B).

**Ključni acceptance kriterijum T2:** novi engine ne sme da zahteva izmenu
Theme Engine paketa. Registruje blok i to je sve.

### 5.1 Dvostruka politika za nepoznat blok

| Kontekst | Ponašanje |
|---|---|
| **Public render** | skip + telemetry (nikad crash) — loš draft ne obara sajt |
| **Publish validacija** | **error** — nemoguće je objaviti dokument sa nepoznatim `type` ili nepoznatim `schemaVersion` |

Isto važi za blok čiji `schemaVersion` registry više ne podržava: na renderu se
preskače, na publish-u je greška.

### 5.2 Data loading — zabranjen waterfall

Vlasništvo nad podacima ide bloku, ali **N blokova ≠ N klijentskih fetch-eva**.
Danas `ThemeLayout` centralizuje pripremu i to se ne sme izgubiti:

- svaki blok registruje **server-side loader** (`loader(ctx) => data`);
- renderer strane skuplja loadere svih vidljivih blokova i izvršava ih
  **paralelno u jednom server prolazu**, sa request-scoped dedupe/cache
  (dva bloka koja traže isti resurs → jedan upit);
- klijentski fetch je izuzetak (interaktivni widget posle hydration-a), nikad
  podrazumevani način dolaska do podataka za prvi render;
- loader sme da vrati samo podatke svog domena — nema „uzmi sve o salonu".

Regresija performansi (LCP na tenant landing strani) je release gate za T2A
jednako kao vizuelna regresija.

## 6. Mapiranje zatečenog na blokove (T2A, bez promene ponašanja)

| Danas | Sutra |
|---|---|
| `heroEnabled` | sekcija `hero`, blok `content.hero` |
| `aboutEnabled` | blok `content.about` |
| `servicesPreviewEnabled` | blok `services.catalog` (capability `services.catalog`) |
| `appointmentEnabled` | blok `booking.services` (capability `booking.services`) |
| `testimonialsEnabled` | blok `content.testimonials` |
| `artistsEnabled` | blok `content.team` |
| `galleryEnabled` + `effectiveGalleryVariant` | blok `content.gallery`, varijanta u `config` |
| `faqEnabled` | blok `content.faq` |
| `blogEnabled` | blok `content.blog` |
| `perksEnabled` | blok `content.perks` |

`LandingStructure` ostaje kao **izvor podataka** u prelaznom periodu: adapter
`landingStructure → ThemeDocument` prevodi zatečeni CMS oblik u sekcije/blokove.
Tek kada sve teme čitaju `ThemeDocument`, CMS piše direktno u novi oblik.

## 7. Redosled (T2A)

1. `packages/theme-engine` — tipovi (`ThemeDocument`, `LayoutDefinition`) +
   validatori (slot/lifecycle/version/schemaVersion) + publish invarijante,
   **nula React/Mongoose/Next zavisnosti** (isti obrazac kao `@panta/diagnostic-engine`).
2. Adapter `lib/platform/theme-client.ts`: `LandingStructure → ThemeDocument`.
3. `FeatureBlockRegistry` u aplikaciji (schema + renderer + **server loader** po
   bloku) + renderer `<ThemeSections document={…} />` sa paralelnim izvršavanjem
   loadera i request-scoped dedupe-om.
4. Migracija tema jedne po jedne (Theme1 prva, Theme8 poslednja jer ima najviše
   sopstvene režije), uz vizuelnu regresiju po temi.
5. `ThemeLandingProps` se svodi na: `document`, `brandingVars`, `resolveHref`,
   `reduceMotion`, `headerProps`, `footerProps`. Domenski tipovi izlaze.

## 8. Acceptance criteria

- [ ] Postojeći salon bez education capability izgleda i ponaša se **identično** kao pre.
- [ ] `packages/theme-engine` nema import `Service`, `Appointment`, `Campaign`,
      `mongoose`, `react`, `next`.
- [ ] Nijedna tema ne sadrži `if (tenant.type === …)` ni vertikalno granjanje.
- [ ] Novi feature blok se dodaje **bez ijedne izmene** u `packages/theme-engine`.
- [ ] Nepoznat `type` bloka: render = skip + telemetry, **publish = error**.
- [ ] `slot` se validira protiv `LayoutDefinition` — nepostojeći slot je greška.
- [ ] `published`/`archived` revizije su immutable; `publish` je atomska zamena.
- [ ] `lifecycle` prelazi i monotonost `version`-a su validirani u paketu i
      pokriveni testovima.
- [ ] Prvi render strane nema po-blok klijentski waterfall — loaderi se izvršavaju
      paralelno na serveru sa request dedupe-om.
- [ ] Sve postojeće teme prolaze vizuelnu **i performansnu** regresiju (LCP) na
      demo tenantima.

## 9. Non-goals za T2A — disciplina slice-a

T2A je **čist architectural extraction**. U njemu nema:

- Education domena ni ijednog education bloka,
- Distribution/Offer/Campaign koda,
- novog UI-ja, novog CMS ekrana ni redizajna,
- capability resolvera (to je T2B; blokovi za sada dobijaju `capability: null`
  ili postojeći plan gate),
- CDN/edge distribucije theme JSON-a (Faza 4 sazrevanja engine-a).

**Apsolutni zahtev:**

> Pre T2A i posle T2A postojeći tenant mora korisniku izgledati kao **isti
> proizvod** — isti raspored, isti tekst, iste slike, isto ponašanje, ista
> brzina.

To je jedini dokaz da je nastala granica, a ne novi rewrite.

## 10. Izlazni gate: review koda protiv dokumenta

Po završetku T2A radi se **kratak review stvarnog koda protiv ovog dokumenta**
(granica, zavisnosti paketa, registry, loaderi, invarijante). T2B kreće tek ako
granica u kodu izgleda onako kako je ovde definisana — plus odvojena staging baza
kao zaseban prerequisite (vidi [T2B 6.1](PANTA-TENANT-VERTICALS-CAPABILITIES.md)).

## Reference

- [Product Engines vizija](../ARHITEKTURA-ENGINES.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Branching strategija](PANTA-BRANCHING-STRATEGY.md)
