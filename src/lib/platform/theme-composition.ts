/**
 * lib/platform/theme-composition.ts
 *
 * T2A.3 — Theme Composition Inventory.
 *
 * ZAŠTO: adapter (`theme-client.ts`) dokazuje **CMS parity** — da `ThemeDocument`
 * nosi iste `enabled` odluke kao zatečeni flagovi. To NIJE isto što i
 * **composition parity**: konkretna tema ne renderuje samo tih 10 CMS sekcija,
 * niti sve poštuje. Primeri iz stvarnog koda:
 *   - Theme2 uopšte ne čita `heroEnabled`/`servicesPreviewEnabled` — renderuje ih uvek;
 *   - Theme5 poštuje samo `artistsEnabled` i `testimonialsEnabled`;
 *   - Theme7 ne čita `appointmentEnabled` (booking je u hero slotu);
 *   - Theme1/3/6/8 imaju sekcije kojih uopšte nema u CMS-u (pricing, tribute…).
 *
 * Ovaj inventar je referentna istina za migraciju tema: šta je CMS blok, šta je
 * tema-native prezentacija, a šta shell. Bez njega bi registry počeo da određuje
 * render pre nego što znamo šta danas zaista stoji na strani.
 *
 * ODLUKA (T2A.3): theme-native elementi OSTAJU vlasništvo teme i ne postaju
 * Feature Block-ovi. Theme8Tribute, dekorativni CTA ili graffiti sloj nisu
 * poslovni feature-i.
 *
 *   ThemeDocument         = konfigurabilni content/business blokovi
 *   Theme Composition     = kako ih konkretna tema slaže + njeni presentation-only delovi
 *   FeatureBlockRegistry  = kako se blok razrešava i puni podacima
 */

/** CMS flagovi koji danas postoje u ThemeLandingProps. */
export type LegacyCmsFlag =
  | "heroEnabled"
  | "aboutEnabled"
  | "artistsEnabled"
  | "servicesPreviewEnabled"
  | "appointmentEnabled"
  | "testimonialsEnabled"
  | "galleryEnabled"
  | "faqEnabled"
  | "blogEnabled"
  | "perksEnabled";

export type LegacyCompositionNode =
  | {
      kind: "cms-block";
      /** Ključ CMS sekcije (isti kao `id` sekcije u ThemeDocument-u). */
      source: string;
      /** Tip bloka u novom kontraktu. */
      blockType: string;
      /** Uslov pod kojim se danas renderuje; "always" = tema ignoriše flag. */
      conditional: string;
    }
  | {
      kind: "theme-native";
      id: string;
      conditional?: string;
    }
  | {
      kind: "shell";
      id: string;
    };

/**
 * Odakle tema danas uzima odluku o vidljivosti sekcije:
 *   "legacy-flags"   — čita `*Enabled` propove iz `ThemeLandingProps`;
 *   "theme-document" — čita `ThemeDocument` kroz `<ThemeBlock>` (migrirano u T2A).
 *
 * Semantika je ista u oba slučaja — `honoredFlags` ostaje spisak flagova koji
 * stvarno utiču na izgled te teme. Menja se samo put kojim odluka stiže, pa i
 * način na koji se inventar proverava protiv koda.
 */
export type ThemeVisibilitySource = "legacy-flags" | "theme-document";

export interface ThemeComposition {
  theme: string;
  visibility: ThemeVisibilitySource;
  /** CMS flagovi koje tema stvarno čita (ostale ignoriše). */
  honoredFlags: LegacyCmsFlag[];
  nodes: LegacyCompositionNode[];
}

/** CMS blokovi teme, redom kojim se renderuju. */
export function cmsBlockTypes(theme: string): string[] {
  return (compositionFor(theme)?.nodes ?? [])
    .filter((n) => n.kind === "cms-block")
    .map((n) => (n as { blockType: string }).blockType);
}

const cms = (
  source: string,
  blockType: string,
  conditional: string,
): LegacyCompositionNode => ({ kind: "cms-block", source, blockType, conditional });

const native = (id: string, conditional?: string): LegacyCompositionNode => ({
  kind: "theme-native",
  id,
  ...(conditional ? { conditional } : {}),
});

const shell = (id: string): LegacyCompositionNode => ({ kind: "shell", id });

export const THEME_COMPOSITIONS: ThemeComposition[] = [
  {
    theme: "theme-1",
    visibility: "theme-document",
    honoredFlags: [
      "heroEnabled",
      "aboutEnabled",
      "servicesPreviewEnabled",
      "appointmentEnabled",
      "testimonialsEnabled",
      "galleryEnabled",
      "faqEnabled",
    ],
    nodes: [
      shell("theme-1/header"),
      cms("hero", "content.hero", "heroEnabled"),
      cms("about", "content.about", "aboutEnabled"),
      native("theme-1/social-proof"),
      cms("servicesPreview", "services.catalog", "servicesPreviewEnabled && services.length > 0"),
      cms("appointmentSection", "booking.services", "appointmentEnabled"),
      cms("testimonials", "content.testimonials", "testimonialsEnabled"),
      cms("gallery", "content.gallery", "galleryEnabled (varijanta bira masonry/grid)"),
      native("theme-1/pricing"),
      cms("faq", "content.faq", "faqEnabled"),
      native("theme-1/image-generation"),
      native("theme-1/cta-booking"),
      shell("theme-1/footer"),
    ],
  },
  {
    theme: "theme-2",
    visibility: "theme-document",
    // Tema ignoriše hero/about/services flagove — renderuje ih uvek.
    // `testimonialsEnabled` se POŠTUJE od T2A-FOLLOWUP normalizacije (spec 6.4):
    // vlasnik je sekciju ugasio u CMS-u, a ona se svejedno prikazivala prazna.
    honoredFlags: ["appointmentEnabled", "galleryEnabled", "testimonialsEnabled"],
    nodes: [
      shell("theme-2/header"),
      cms("hero", "content.hero", "always"),
      cms("about", "content.about", "always"),
      cms("servicesPreview", "services.catalog", "always"),
      cms("gallery", "content.gallery", "galleryEnabled (varijanta bira masonry/grid)"),
      cms("appointmentSection", "booking.services", "appointmentEnabled"),
      native("theme-2/why-choose-us"),
      native("theme-2/pricing"),
      // Ranije dva odvojena prikaza, oba bezuslovna. Sada jedan blok + varijanta,
      // i sekcija poštuje CMS toggle (normalizacija, spec 6.4).
      cms(
        "testimonials",
        "content.testimonials",
        "testimonialsEnabled (varijanta prikaza: cards)",
      ),
      native("theme-2/cta-appointment"),
      shell("theme-2/footer"),
    ],
  },
  {
    theme: "theme-3",
    visibility: "theme-document",
    honoredFlags: [
      "heroEnabled",
      "aboutEnabled",
      "servicesPreviewEnabled",
      "appointmentEnabled",
      "testimonialsEnabled",
      "galleryEnabled",
      "faqEnabled",
      "blogEnabled",
    ],
    nodes: [
      shell("theme-3/header"),
      cms("hero", "content.hero", "heroEnabled"),
      cms("about", "content.about", "aboutEnabled"),
      cms("servicesPreview", "services.catalog", "servicesPreviewEnabled"),
      cms("testimonials", "content.testimonials", "testimonialsEnabled"),
      cms("gallery", "content.gallery", "galleryEnabled (varijanta bira masonry/grid)"),
      native("theme-3/pricing"),
      cms("appointmentSection", "booking.services", "appointmentEnabled"),
      cms("faq", "content.faq", "faqEnabled"),
      cms("blog", "content.blog", "blogEnabled"),
      native("theme-3/cta"),
      native("theme-3/newsletter"),
      shell("theme-3/footer"),
    ],
  },
  {
    theme: "theme-4",
    visibility: "theme-document",
    honoredFlags: [
      "heroEnabled",
      "aboutEnabled",
      "servicesPreviewEnabled",
      "appointmentEnabled",
      "galleryEnabled",
      "faqEnabled",
    ],
    nodes: [
      shell("theme-4/header"),
      cms("hero", "content.hero", "heroEnabled"),
      cms("about", "content.about", "aboutEnabled"),
      cms("servicesPreview", "services.catalog", "servicesPreviewEnabled"),
      native("theme-4/working-hours"),
      native("theme-4/cta"),
      cms("appointmentSection", "booking.services", "appointmentEnabled"),
      cms("gallery", "content.gallery", "galleryEnabled (varijanta bira masonry/grid)"),
      cms("faq", "content.faq", "faqEnabled"),
      shell("theme-4/footer"),
    ],
  },
  {
    theme: "theme-5",
    visibility: "legacy-flags",
    // Najmanje CMS-gated tema: sve osim artists/testimonials je bezuslovno.
    honoredFlags: ["artistsEnabled", "testimonialsEnabled"],
    nodes: [
      shell("theme-5/header"),
      cms("hero", "content.hero", "always"),
      cms("servicesPreview", "services.catalog", "always"),
      native("theme-5/working-hours"),
      native("theme-5/how-it-works"),
      cms("appointmentSection", "booking.services", "always"),
      native("theme-5/pricing"),
      native("theme-5/cta"),
      cms("artists", "content.team", "artistsEnabled"),
      cms("about", "content.about", "always"),
      cms("testimonials", "content.testimonials", "testimonialsEnabled"),
      cms("gallery", "content.gallery", "always"),
      shell("theme-5/footer"),
    ],
  },
  {
    theme: "theme-6",
    visibility: "theme-document",
    honoredFlags: [
      "heroEnabled",
      "aboutEnabled",
      "servicesPreviewEnabled",
      "artistsEnabled",
      "testimonialsEnabled",
      "galleryEnabled",
    ],
    nodes: [
      shell("theme-6/header"),
      cms("hero", "content.hero", "heroEnabled"),
      cms("about", "content.about", "aboutEnabled"),
      native("theme-6/feature-cards"),
      cms("servicesPreview", "services.catalog", "servicesPreviewEnabled && services.length > 0"),
      native("theme-6/pricing"),
      cms("testimonials", "content.testimonials", "testimonialsEnabled && testimonials.length > 0"),
      cms("artists", "content.team", "artistsEnabled"),
      cms("gallery", "content.gallery", "galleryEnabled && galleryImages.length > 0"),
      native("theme-6/promo-banner"),
      native("theme-6/instagram-strip", "galleryEnabled"),
      native("theme-6/newsletter"),
      shell("theme-6/footer"),
    ],
  },
  {
    theme: "theme-7",
    visibility: "legacy-flags",
    // Booking je unutar hero sekcije (bookingSlot), pa appointmentEnabled nema efekta.
    honoredFlags: [
      "heroEnabled",
      "aboutEnabled",
      "servicesPreviewEnabled",
      "testimonialsEnabled",
      "galleryEnabled",
      "faqEnabled",
    ],
    nodes: [
      shell("theme-7/header"),
      cms("hero", "content.hero", "heroEnabled"),
      cms("appointmentSection", "booking.services", "always (slot u hero sekciji)"),
      cms("about", "content.about", "aboutEnabled"),
      native("theme-7/social-proof"),
      cms("servicesPreview", "services.catalog", "servicesPreviewEnabled && services.length > 0"),
      cms("gallery", "content.gallery", "galleryEnabled"),
      cms("testimonials", "content.testimonials", "testimonialsEnabled"),
      cms("faq", "content.faq", "faqEnabled"),
      shell("theme-7/footer"),
    ],
  },
  {
    theme: "theme-8",
    visibility: "legacy-flags",
    // Nema booking sekcije ni artists/blog — Y2K shell slojevi su bitan deo teme.
    honoredFlags: [
      "heroEnabled",
      "aboutEnabled",
      "servicesPreviewEnabled",
      "testimonialsEnabled",
      "galleryEnabled",
      "faqEnabled",
      "perksEnabled",
    ],
    nodes: [
      shell("theme-8/preloader"),
      shell("theme-8/y2k-filters"),
      shell("theme-8/background-wall"),
      shell("theme-8/fixed-decor"),
      shell("theme-8/doodle-layer"),
      shell("theme-8/modal-provider"),
      shell("theme-8/intro-fade"),
      shell("theme-8/header"),
      cms("hero", "content.hero", "heroEnabled"),
      cms("about", "content.about", "aboutEnabled"),
      native("theme-8/social-proof"),
      cms("servicesPreview", "services.catalog", "servicesPreviewEnabled && services.length > 0"),
      cms("gallery", "content.gallery", "galleryEnabled"),
      cms("perks", "content.perks", "perksEnabled"),
      cms("testimonials", "content.testimonials", "testimonialsEnabled"),
      cms("faq", "content.faq", "faqEnabled"),
      native("theme-8/tribute"),
      shell("theme-8/footer"),
      shell("theme-8/sparkle-layer"),
    ],
  },
];

export function compositionFor(theme: string): ThemeComposition | undefined {
  return THEME_COMPOSITIONS.find((c) => c.theme === theme);
}

/**
 * CMS sekcije koje tema renderuje BEZ obzira na `enabled` flag. Ovo je spisak
 * mesta gde bi naivna migracija na registry promenila ponašanje — svaka tema
 * mora da ih svesno reši (poštuj flag ili ga eksplicitno ignoriši).
 */
export function unconditionalCmsBlocks(theme: string): string[] {
  return (compositionFor(theme)?.nodes ?? [])
    .filter((n) => n.kind === "cms-block" && n.conditional.startsWith("always"))
    .map((n) => (n as { source: string }).source);
}
