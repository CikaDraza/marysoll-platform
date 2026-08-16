# PANTA T2 — Theme/Layout Engine granica (odluka 2026-08-16)

> Grana: `product-engines/theme-engine/layout-contract`.
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
  type: string;        // npr. "education.catalog" — engine ga ne tumači
  slot: string;        // imenovana pozicija u sekciji ("main", "aside", "cta")
  config?: unknown;    // validira feature schema, ne engine
}

interface LayoutSection {
  id: string;
  variant?: string;
  blocks: LayoutBlock[];
}

interface ThemeDocument {
  version: number;
  brand: {
    logo?: string;
    colors: Record<string, string>;
    typography: Record<string, unknown>;
  };
  sections: LayoutSection[];
  lifecycle: "draft" | "published" | "archived" | "preview";
}
```

Engine validira: da su `id`-jevi jedinstveni, da `slot` postoji u varijanti
sekcije, da je `lifecycle` prelaz dozvoljen, da je `version` monotono rastuć.
Engine **ne** validira `config` — to radi feature schema.

## 5. Feature Block Registry (u aplikaciji, ne u paketu)

```ts
registerFeatureBlock({
  type: "services.catalog",
  capability: "services.catalog",
  schema: ServicesCatalogSchema,
  renderer: ServicesCatalogBlock,
});

registerFeatureBlock({
  type: "booking.education",
  capability: "booking.education",
  schema: EducationBookingSchema,
  renderer: EducationBookingBlock,
});
```

Renderer dobija samo svoj `config` i sopstvene podatke (kroz svoj engine/API) —
**ne** kroz `ThemeLandingProps`. Blok bez razrešene capability se ne renderuje
(vidi T2B); nepoznat `type` se preskače uz warning, nikad ne ruši stranu.

**Ključni acceptance kriterijum T2:** novi engine ne sme da zahteva izmenu
Theme Engine paketa. Registruje blok i to je sve.

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

1. `packages/theme-engine` — tipovi + validatori + lifecycle prelazi, **nula
   React/Mongoose/Next zavisnosti** (isti obrazac kao `@panta/diagnostic-engine`).
2. Adapter `lib/platform/theme-client.ts`: `LandingStructure → ThemeDocument`.
3. `FeatureBlockRegistry` u aplikaciji + renderer `<ThemeSections document={…} />`.
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
- [ ] Nepoznat `type` bloka ne ruši render (skip + warning).
- [ ] `lifecycle` prelazi su validirani u paketu i pokriveni testovima.
- [ ] Sve postojeće teme prolaze vizuelnu regresiju na demo tenantima.

## 9. Non-goals za T2A

- Nema novih product funkcija (education blokovi dolaze u T-EDUCATION).
- Nema CMS redizajna — samo adapter na novi kontrakt.
- Nema CDN/edge distribucije theme JSON-a (Faza 4 sazrevanja engine-a).

## Reference

- [Product Engines vizija](../ARHITEKTURA-ENGINES.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Branching strategija](PANTA-BRANCHING-STRATEGY.md)
