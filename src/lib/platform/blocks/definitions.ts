/**
 * lib/platform/blocks/definitions.ts — sadržaj FeatureBlockRegistry-ja.
 *
 * Deset blokova iz mapiranja u spec 6. Svaki nosi: shemu config-a, server
 * loader nad svojim domenom i capability (T2B placeholder = `null`).
 *
 * Pravila koja se ovde poštuju:
 *   - loader vraća SAMO podatke svog domena (spec 5.2) — nema „uzmi sve o salonu";
 *   - loader ne zna koja ga tema renderuje i ne grana ponašanje po temi;
 *   - loader ne zna za `enabled` flag: da li se blok renderuje odlučuje
 *     postojanje bloka (dokument) ili compat sloj, nikad loader.
 */

import { z } from "zod";
import { mergeHeroSocial } from "@/helpers/heroSocial";
import type {
  BlockConfigByType,
  ConfigParseResult,
  FeatureBlockDefinition,
  FeatureBlockType,
} from "./types";

/** Sve sheme dele `source` — CMS sekciju iz koje blok čita. */
const sourceSchema = <T extends string>(source: T) =>
  z.object({ source: z.literal(source) });

const heroConfigSchema = sourceSchema("hero").extend({
  variant: z
    .enum(["center-image", "split-left-image", "grid-right-images"])
    .optional(),
});

/**
 * Više prikaza istog bloka = varijante, ne dodatni blokovi. Enum, ne boolean-i:
 * tačno jedna varijanta može biti aktivna.
 */
const testimonialsConfigSchema = sourceSchema("testimonials").extend({
  presentationVariant: z.enum(["cards", "highlights"]).optional(),
});

const galleryConfigSchema = sourceSchema("gallery").extend({
  galleryVariant: z.enum(["images-only", "images-with-category"]),
  variant: z.enum(["zigzag", "masonry"]).optional(),
});

function parseWith<K extends FeatureBlockType>(
  schema: z.ZodType<BlockConfigByType[K]>,
) {
  return (raw: unknown): ConfigParseResult<BlockConfigByType[K]> => {
    const result = schema.safeParse(raw);
    return result.success
      ? { ok: true, value: result.data }
      : { ok: false, error: result.error.issues.map((i) => i.message).join("; ") };
  };
}

const contentHero: FeatureBlockDefinition<"content.hero"> = {
  type: "content.hero",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"content.hero">(heroConfigSchema),
  async load({ deps }) {
    const [ls, salon, stats] = await Promise.all([
      deps.landingStructure(),
      deps.salon(),
      deps.tenantStats(),
    ]);
    // Isti merge koristi i zatečeni put za nemigrirane teme (`helpers/heroSocial`).
    const social = mergeHeroSocial(salon.social, ls?.landing?.hero?.socialLinks);
    return {
      content: ls?.landing?.hero,
      salon: { ...salon, social },
      stats,
      experience: {
        yearsOfExperience: ls?.landing?.about?.yearsOfExperience,
        openingYear: ls?.landing?.about?.openingYear,
      },
    };
  },
};

const contentAbout: FeatureBlockDefinition<"content.about"> = {
  type: "content.about",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"content.about">(sourceSchema("about")),
  async load({ deps }) {
    const [ls, stats, salon] = await Promise.all([
      deps.landingStructure(),
      deps.tenantStats(),
      deps.salon(),
    ]);
    return {
      content: ls?.landing?.about,
      stats,
      authoredStats: ls?.landing?.stats,
      salonName: salon.name,
    };
  },
};

const contentTeam: FeatureBlockDefinition<"content.team"> = {
  type: "content.team",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"content.team">(sourceSchema("artists")),
  async load({ deps }) {
    const ls = await deps.landingStructure();
    return { content: ls?.landing?.artists };
  },
};

const servicesCatalog: FeatureBlockDefinition<"services.catalog"> = {
  type: "services.catalog",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"services.catalog">(sourceSchema("servicesPreview")),
  async load({ deps }) {
    const [ls, services] = await Promise.all([
      deps.landingStructure(),
      deps.services(),
    ]);
    return { content: ls?.landing?.servicesPreview, services };
  },
};

const bookingServices: FeatureBlockDefinition<"booking.services"> = {
  type: "booking.services",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"booking.services">(sourceSchema("appointmentSection")),
  async load({ deps }) {
    const [ls, services, salon] = await Promise.all([
      deps.landingStructure(),
      deps.services(),
      deps.salon(),
    ]);
    return { content: ls?.landing?.appointmentSection, services, salon };
  },
};

const contentTestimonials: FeatureBlockDefinition<"content.testimonials"> = {
  type: "content.testimonials",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"content.testimonials">(testimonialsConfigSchema),
  async load({ deps }) {
    const [ls, testimonials, stats] = await Promise.all([
      deps.landingStructure(),
      deps.testimonials(),
      deps.tenantStats(),
    ]);
    return { content: ls?.landing?.testimonials, testimonials, stats };
  },
};

const contentGallery: FeatureBlockDefinition<"content.gallery"> = {
  type: "content.gallery",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"content.gallery">(galleryConfigSchema),
  async load({ config, deps }) {
    const [ls, salon] = await Promise.all([deps.landingStructure(), deps.salon()]);
    return {
      content: ls?.landing?.gallery,
      galleryVariant: config.galleryVariant,
      instagramFallback: salon.social?.instagram ?? "",
    };
  },
};

const contentFaq: FeatureBlockDefinition<"content.faq"> = {
  type: "content.faq",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"content.faq">(sourceSchema("faq")),
  async load({ deps }) {
    const ls = await deps.landingStructure();
    return { content: ls?.landing?.faq };
  },
};

const contentBlog: FeatureBlockDefinition<"content.blog"> = {
  type: "content.blog",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"content.blog">(sourceSchema("blog")),
  async load({ deps }) {
    const [ls, salon] = await Promise.all([
      deps.landingStructure(),
      deps.salon(),
    ]);
    return {
      content: ls?.landing?.blog,
      author: { name: salon.name, image: salon.logo ?? undefined },
    };
  },
};

const contentPerks: FeatureBlockDefinition<"content.perks"> = {
  type: "content.perks",
  schemaVersions: [1],
  capability: null,
  parseConfig: parseWith<"content.perks">(sourceSchema("perks")),
  async load({ deps }) {
    const ls = await deps.landingStructure();
    return { content: ls?.landing?.perks };
  },
};

export const FEATURE_BLOCK_DEFINITIONS = [
  contentHero,
  contentAbout,
  contentTeam,
  servicesCatalog,
  bookingServices,
  contentTestimonials,
  contentGallery,
  contentFaq,
  contentBlog,
  contentPerks,
] as const satisfies readonly FeatureBlockDefinition<FeatureBlockType>[];
