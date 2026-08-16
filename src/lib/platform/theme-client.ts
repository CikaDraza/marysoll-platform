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
};

/** Redosled sekcija na landing strani — isti kao u današnjim ThemeNLanding. */
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
};

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

/** Je li sekcija vidljiva — jedini izvor istine za oba sveta (CMS i blokovi). */
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
    if (!isSectionEnabled(ls, key)) continue;

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
