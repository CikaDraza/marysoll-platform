/**
 * lib/platform/theme-client.ts
 *
 * Adapter Marysoll ⇄ @panta/theme-engine — isti obrazac kao diagnostic-client.
 *
 * Prevodi zatečeni CMS oblik (`LandingStructure`) u generički `ThemeDocument`
 * koji engine razume. Ovo je PRELAZNI sloj: dok sve teme ne čitaju
 * `ThemeDocument`, CMS i dalje piše u `LandingStructure`, a adapter je jedini
 * koji zna kako jedno preslikava u drugo.
 *
 * Pravilo: adapter sme da zna Marysoll pojmove; paket ne sme.
 * Spec: docs/PANTA-T2-THEME-LAYOUT-ENGINE.md (T2A).
 */

import type {
  LayoutBlock,
  LayoutDefinition,
  LayoutSection,
  ThemeDocument,
} from "@panta/theme-engine";
import type { LandingStructure } from "@/types";
import {
  isTheme9TristateSection,
  resolveTheme9Section,
} from "@/lib/theme9/presentationResolver";

/**
 * Podrazumevana vidljivost sekcije kad CMS nema `enabled`.
 * Preslikava tačno zatečeno ponašanje `ThemeLayout`-a (l. 89–99):
 * sve je uključeno po defaultu OSIM blog/perks.
 */
const SECTION_DEFAULT_ENABLED = {
  hero: true,
  about: true,
  artists: true,
  servicesPreview: true,
  appointmentSection: true,
  testimonials: true,
  gallery: true,
  faq: true,
  blog: false,
  perks: false,
  // theme-9 „Expert Editorial" sekcije. `false` je obavezno: uključivanjem bi
  // svih osam postojećih tema odjednom dobilo šest blokova bez renderera.
  audiencePaths: false,
  topicHub: false,
  guidedCareProcess: false,
  credentials: false,
  featuredEducation: false,
  professionalPath: false,
  finalCta: false,
} as const;

export type LandingSectionKey = keyof typeof SECTION_DEFAULT_ENABLED;

/**
 * Mapiranje CMS sekcije → (sectionType, block type) u novom kontraktu.
 * `services.catalog` i `booking.services` su feature blokovi (imaće capability
 * u T2B); ostalo su content blokovi.
 */
const SECTION_BLOCK_MAP: Record<
  LandingSectionKey,
  { sectionType: string; blockType: string }
> = {
  hero: { sectionType: "hero", blockType: "content.hero" },
  about: { sectionType: "content", blockType: "content.about" },
  artists: { sectionType: "content", blockType: "content.team" },
  servicesPreview: { sectionType: "content", blockType: "services.catalog" },
  appointmentSection: { sectionType: "content", blockType: "booking.services" },
  testimonials: { sectionType: "content", blockType: "content.testimonials" },
  gallery: { sectionType: "content", blockType: "content.gallery" },
  faq: { sectionType: "content", blockType: "content.faq" },
  blog: { sectionType: "content", blockType: "content.blog" },
  perks: { sectionType: "content", blockType: "content.perks" },
  audiencePaths: {
    sectionType: "content",
    blockType: "content.audience-paths",
  },
  topicHub: { sectionType: "content", blockType: "education.topic-hub" },
  guidedCareProcess: {
    sectionType: "content",
    blockType: "content.guided-care-process",
  },
  credentials: { sectionType: "content", blockType: "content.credentials" },
  featuredEducation: {
    sectionType: "content",
    blockType: "content.featured-education",
  },
  professionalPath: {
    sectionType: "content",
    blockType: "content.professional-path",
  },
  finalCta: { sectionType: "content", blockType: "content.final-cta" },
};

/**
 * Redosled sekcija na landing strani — isti kao u današnjim ThemeNLanding.
 *
 * Ovo je redosled SASTAVLJANJA dokumenta, ne redosled renderovanja: konkretna
 * tema crta blokove redom kojim ih poziva u svom JSX-u (i taj redosled čuva
 * composition inventory + test). Zato su theme-9 sekcije dodate na kraj —
 * ubacivanje između postojećih ključeva ne bi promenilo nijednu temu, samo bi
 * sugerisalo redosled koji ovde ne važi.
 */
export const SECTION_ORDER: LandingSectionKey[] = [
  "hero",
  "about",
  "artists",
  "servicesPreview",
  "appointmentSection",
  "testimonials",
  "gallery",
  "faq",
  "blog",
  "perks",
  "audiencePaths",
  "topicHub",
  "guidedCareProcess",
  "credentials",
  "featuredEducation",
  "professionalPath",
  "finalCta",
];

export function blockTypeForSection(key: LandingSectionKey): string {
  return SECTION_BLOCK_MAP[key].blockType;
}

/**
 * Id bloka jedne CMS sekcije. Jedno mesto konvencije: dokument (adapter) i
 * legacy-always compat putanja MORAJU da grade isti id, jer se po njemu traže
 * učitani podaci pri renderu.
 */
export function sectionBlockId(key: LandingSectionKey): string {
  return `${key}-block`;
}

export const LANDING_LAYOUT_DEFINITION_ID = "marysoll-landing-v1";

/**
 * Jedna definicija za svih 8 tema: dok traje prelaz, teme dele isti skup
 * sekcija, a razlikuju se samo u rendereru. Kada tema dobije svoj raspored,
 * dobija i svoj `LayoutDefinition`.
 */
export const LANDING_LAYOUT_DEFINITION: LayoutDefinition = {
  id: LANDING_LAYOUT_DEFINITION_ID,
  version: 1,
  sections: [
    {
      sectionType: "hero",
      variants: {
        default: { slots: [{ name: "main", maxBlocks: 1 }] },
      },
    },
    {
      sectionType: "content",
      variants: {
        default: { slots: [{ name: "main", maxBlocks: 1, accepts: "any" }] },
      },
    },
  ],
};

/** Isto kao THEME_GALLERY_DEFAULTS u ThemeLayout-u (l. 101–114). */
const THEME_GALLERY_DEFAULTS: Record<
  string,
  "images-only" | "images-with-category"
> = {
  "theme-1": "images-with-category",
  "theme-2": "images-with-category",
  "theme-3": "images-only",
  "theme-4": "images-only",
  "theme-5": "images-only",
  "theme-6": "images-only",
  "theme-7": "images-with-category",
  "theme-8": "images-with-category",
  "theme-9": "images-only",
};

/**
 * Kad JEDNA tema ima više prikaza istog bloka, izbor je varijanta tog bloka —
 * nikad drugi blok iste semantike. Ovde stoji podrazumevana varijanta po temi
 * (isti obrazac kao `THEME_GALLERY_DEFAULTS`; CMS je još ne nudi).
 *
 * theme-2 ima dva prikaza utisaka u kodu: `Theme2Testimonials` ("cards", ono
 * što tenant danas vidi) i `Theme2TestimonialsSection` ("highlights", tiho jer
 * ima guard za prazan spisak). Migracija zadržava produkcioni prikaz.
 */
const THEME_TESTIMONIALS_DEFAULTS: Record<string, "cards" | "highlights"> = {
  "theme-2": "cards",
};

export function resolveTestimonialsVariant(
  theme?: string,
): "cards" | "highlights" | undefined {
  return theme ? THEME_TESTIMONIALS_DEFAULTS[theme] : undefined;
}

export function resolveGalleryVariant(
  ls: LandingStructure | undefined,
  theme?: string,
): "images-only" | "images-with-category" {
  return (
    ls?.landing?.gallery?.galleryVariant ??
    (theme ? THEME_GALLERY_DEFAULTS[theme] : undefined) ??
    "images-only"
  );
}

/**
 * Vidljivost sekcije — JEDNO mesto, DVA različita ugovora.
 *
 * Sedam theme-9 sekcija ide kroz presentation resolver (tri-state + policy);
 * sve ostale zadržavaju zatečeni `enabled ?? SECTION_DEFAULT_ENABLED`.
 *
 * Razdvajanje je namerno i zaključano (`docs/TODO.md`, „Ne generalizovati svih
 * 10 blokova"): `about` ima svoj tenant-derived fallback, `blog` je runtime-data
 * policy, `hero` postojeći mapper ugovor. Da svih 10 ide kroz isti resolver,
 * theme-9 popravka bi menjala ponašanje tema 1–8.
 */
export function isSectionVisible(
  ls: LandingStructure | undefined,
  key: LandingSectionKey,
): boolean {
  if (isTheme9TristateSection(key)) {
    return resolveTheme9Section(ls?.landing?.[key]) !== "hidden";
  }
  return isSectionEnabled(ls, key);
}

/**
 * Zatečeni binarni ugovor za sekcije starijih tema.
 *
 * Za sedam theme-9 sekcija NE koristiti direktno — one idu kroz
 * `isSectionVisible()`, koji zna za tri-state i policy.
 */
export function isSectionEnabled(
  ls: LandingStructure | undefined,
  key: LandingSectionKey,
): boolean {
  const section = ls?.landing?.[key] as { enabled?: boolean } | undefined;
  return section?.enabled ?? SECTION_DEFAULT_ENABLED[key];
}

export interface ToThemeDocumentOptions {
  /** "theme-1" … "theme-8" — potreban samo za fallback gallery varijante. */
  theme?: string;
  /** Verzija dokumenta; prelazni adapter uvek daje 1 ako se ne zada. */
  version?: number;
  /** Brand tokeni; u prelazu ih puni ThemeLayout iz salon.branding. */
  brand?: ThemeDocument["brand"];
}

/**
 * Blok jedne CMS sekcije — JEDINI konstruktor.
 *
 * Koriste ga dva pozivaoca: adapter (za sekcije koje su u dokumentu) i
 * legacy-always compat sloj (za sekcije koje tema danas renderuje uprkos
 * `enabled: false`). Zato compat blok ima identičan `type`, `schemaVersion` i
 * `config` kao normalan — razlikuje se samo po tome ko ga je naručio.
 */
export function buildSectionBlock(
  ls: LandingStructure | undefined,
  key: LandingSectionKey,
  options: { theme?: string } = {},
): LayoutBlock {
  const raw = ls?.landing?.[key] as Record<string, unknown> | undefined;

  const config: Record<string, unknown> = { source: key };
  if (key === "gallery") {
    config.galleryVariant = resolveGalleryVariant(ls, options.theme);
  }
  if (key === "testimonials") {
    const variant = resolveTestimonialsVariant(options.theme);
    if (variant) config.presentationVariant = variant;
  }
  if (raw?.variant) config.variant = raw.variant;

  return {
    id: sectionBlockId(key),
    type: blockTypeForSection(key),
    schemaVersion: 1,
    slot: "main",
    config,
  };
}

/**
 * `LandingStructure` → `ThemeDocument`.
 *
 * Isključene sekcije se NE upisuju u dokument — dokument opisuje ono što se
 * renderuje. Time se `heroEnabled`/`servicesPreviewEnabled`/… flagovi gase kao
 * kategorija: umesto boolean-a po temi, postoji ili ne postoji blok.
 */
export function landingStructureToThemeDocument(
  ls: LandingStructure | undefined,
  options: ToThemeDocumentOptions = {},
): ThemeDocument {
  const sections: LayoutSection[] = [];

  for (const key of SECTION_ORDER) {
    if (!isSectionVisible(ls, key)) continue;

    const { sectionType } = SECTION_BLOCK_MAP[key];
    const block = buildSectionBlock(ls, key, { theme: options.theme });

    sections.push({ id: key, sectionType, blocks: [block] });
  }

  return {
    version: options.version ?? 1,
    layoutDefinitionId: LANDING_LAYOUT_DEFINITION_ID,
    brand: options.brand ?? { colors: {}, typography: {} },
    sections,
    lifecycle: "published",
  };
}

/**
 * Pomoćnik za regresiju: iz dokumenta izvuci vidljivost po zatečenim ključevima,
 * da se novi i stari put mogu porediti 1:1 dok traje migracija tema.
 */
export function enabledSectionKeys(doc: ThemeDocument): LandingSectionKey[] {
  return doc.sections.map((s) => s.id as LandingSectionKey);
}
