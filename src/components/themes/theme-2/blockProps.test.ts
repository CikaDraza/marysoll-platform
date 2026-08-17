/**
 * Theme2 migracija — regresija PROPOVA nad stvarnim tenantima.
 *
 * Referentna istina je doslovna kopija JSX izraza iz `Theme2Landing` pre
 * migracije (commit 704d56f).
 *
 * Theme2 je prvi test compat sloja: hero/about/servicesPreview su bezuslovne
 * sekcije, pa moraju imati podatke i kad je `enabled: false`. Utisci su od
 * T2A-FOLLOWUP normalizacije (spec 6.4) izuzeti — ta sekcija poštuje CMS toggle.
 */
import { describe, expect, it } from "vitest";
import type { IService, LandingStructure, SalonProfileData } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";
import fixtures from "@/lib/platform/__fixtures__/landing-structures.json";
import {
  landingStructureToThemeDocument,
  sectionBlockId,
} from "@/lib/platform/theme-client";
import {
  LEGACY_ALWAYS_ORIGIN,
  preloadedBlockDataSource,
  resolveThemeBlockData,
} from "@/lib/platform/blocks";
import type {
  ContentAboutData,
  ContentGalleryData,
  ContentHeroData,
  ContentTestimonialsData,
  ServicesCatalogData,
  TestimonialsBlockConfig,
} from "@/lib/platform/blocks/types";
import {
  theme2AboutProps,
  theme2GalleryRender,
  theme2HeroProps,
  theme2ServicesCatalogProps,
  theme2TestimonialsRender,
} from "./blockProps";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);
const SHISHAM = tenants.find(([s]) => s === "shisham-frizerski-salon")![1];
/** Tenant sa UKLJUČENIM utiscima — posle normalizacije samo takav ima blok. */
const WITH_TESTIMONIALS = tenants.find(([s]) => s === "marysoll-makeup-nails")![1];

const TENANT_SLUG = "shisham-frizerski-salon";
const SERVICES = [{ _id: "s1", name: "Šišanje" }] as unknown as IService[];
const TESTIMONIALS: PublicTestimonial[] = [];
const SOME_TESTIMONIALS: PublicTestimonial[] = [
  { _id: "t1", clientName: "Ana", rating: 5, comment: "Odlično" },
];
const STATS: TenantStats = {
  clientCount: 137,
  appointmentCount: 480,
  completedAppointmentCount: 412,
  averageRating: 4.9,
  reviewCount: 12,
};

function resolveHref(href: string) {
  if (!href) return "#";
  if (/^https?:\/\//.test(href)) return href;
  return href.startsWith("/") ? `/${TENANT_SLUG}${href}` : `/${TENANT_SLUG}/${href}`;
}

function salonFor(ls: LandingStructure): SalonProfileData {
  return {
    _id: "salon-2",
    name: "Shi Sham",
    email: "salon@example.com",
    description: "Frizerski salon",
    phone: "060/000-000",
    street: "Ulica 1",
    city: "Bor",
    social: { instagram: "shisham_ig" },
    landingStructure: ls,
  } as unknown as SalonProfileData;
}

/**
 * Doslovno prepisan URL iz starog `Theme2Landing` (l. 76). NAMERNO se ne uvozi
 * `THEME2_ABOUT_IMAGE_URL` — test koji proverava konstantu tako što je uveze ne
 * proverava ništa; promena konstante mora da obori ovaj test.
 */
const LEGACY_ABOUT_IMAGE_URL =
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1776463003/Gemini_Generated_Image_dvp99xdvp99xdvp9_uaamaf.png";

/** Doslovna kopija propova iz starog `Theme2Landing`. */
function legacyProps(
  ls: LandingStructure,
  salon: SalonProfileData,
  stats: TenantStats | undefined,
  testimonials: PublicTestimonial[],
) {
  const heroCtas = ls?.landing?.hero?.ctas;
  const instagram = salon.social?.instagram || "";
  return {
    hero: {
      salonName: salon.name,
      salonDescription: salon.description,
      salonPhone: salon.phone,
      salonCity: salon.city,
      salonStreet: salon.street,
      headline: ls?.landing?.hero?.headline,
      subheadline: ls?.landing?.hero?.subheadline,
      imageUrl: ls?.landing?.hero?.image?.src,
      cta: {
        primary: {
          text: heroCtas?.primary?.text || "",
          href: resolveHref(heroCtas?.primary?.href || "/termini"),
        },
        secondary: heroCtas?.secondary
          ? {
              text: heroCtas.secondary.text || "",
              href: resolveHref(heroCtas.secondary.href || "/usluge"),
            }
          : undefined,
      },
    },
    about: {
      title: ls?.landing?.about?.headline || "O nama",
      text: ls?.landing?.about?.paragraphs || "Saznajte više o nama",
      links: ls?.landing?.about?.links ?? [],
      imageUrl: LEGACY_ABOUT_IMAGE_URL,
      stats: stats
        ? [
            {
              value: formatStatValue(stats.clientCount),
              label: "Zadovoljnih klijenata",
            },
            {
              value: formatStatValue(stats.completedAppointmentCount),
              label: "Urađenih tretmana",
            },
            ...(ls?.landing?.about?.yearsOfExperience
              ? [
                  {
                    value: `${ls.landing.about.yearsOfExperience}+`,
                    label: "Godina iskustva",
                  },
                ]
              : []),
          ]
        : undefined,
    },
    services: {
      showIcons: ls?.landing?.servicesPreview?.showIcons ?? true,
      services: SERVICES,
      headline: ls?.landing?.servicesPreview?.headline,
      subheadline: ls?.landing?.servicesPreview?.subheadline,
      tenantSlug: TENANT_SLUG,
    },
    galleryGrid: {
      instagramUrl: ls?.landing?.gallery?.instagram?.link || instagram,
      instagramTag: ls?.landing?.gallery?.instagram?.username || instagram,
      headline: ls?.landing?.gallery?.headline,
      subheadline: ls?.landing?.gallery?.subheadline,
      treatments:
        ls?.landing?.gallery?.treatments &&
        ls.landing.gallery.treatments.length > 0
          ? ls.landing.gallery.treatments
          : undefined,
      tenantSlug: TENANT_SLUG,
    },
    galleryMasonry: {
      images: ls?.landing?.gallery?.images,
      headline: ls?.landing?.gallery?.headline,
    },
    // <Theme2Testimonials testimonials={testimonials} headline="" />
    testimonials: { testimonials, headline: "" },
  };
}

async function blockDataFor(
  ls: LandingStructure,
  opts: { testimonials?: PublicTestimonial[]; stats?: TenantStats } = {},
) {
  const salon = salonFor(ls);
  const document = landingStructureToThemeDocument(ls, { theme: "theme-2" });
  const data = await resolveThemeBlockData({
    document,
    theme: "theme-2",
    tenantSlug: TENANT_SLUG,
    deps: preloadedBlockDataSource({
      salon,
      services: SERVICES,
      testimonials: opts.testimonials ?? TESTIMONIALS,
      tenantStats: opts.stats ?? STATS,
    }),
  });
  return { salon, document, data };
}

describe.each(tenants)("%s — propovi su identični starom putu", (slug, ls) => {
  it("hero", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("hero")];
    expect(block, slug).toBeDefined();
    expect(theme2HeroProps(block!.data as ContentHeroData, resolveHref)).toEqual(
      legacyProps(ls, salon, STATS, TESTIMONIALS).hero,
    );
  });

  it("about (uključujući statistiku iz tenant metrika)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("about")];
    expect(theme2AboutProps(block!.data as ContentAboutData)).toEqual(
      legacyProps(ls, salon, STATS, TESTIMONIALS).about,
    );
  });

  it("about bez tenant metrika → stats undefined", async () => {
    const salon = salonFor(ls);
    const document = landingStructureToThemeDocument(ls, { theme: "theme-2" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-2",
      deps: preloadedBlockDataSource({
        salon,
        services: SERVICES,
        testimonials: TESTIMONIALS,
      }),
    });
    const block = data[sectionBlockId("about")];
    expect(theme2AboutProps(block!.data as ContentAboutData).stats).toBeUndefined();
  });

  it("servicesPreview", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("servicesPreview")];
    expect(
      theme2ServicesCatalogProps(block!.data as ServicesCatalogData, TENANT_SLUG),
    ).toEqual(legacyProps(ls, salon, STATS, TESTIMONIALS).services);
  });

  it("gallery — ista varijanta i isti propovi", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("gallery")];
    const render = theme2GalleryRender(
      block!.data as ContentGalleryData,
      TENANT_SLUG,
    );
    const legacy = legacyProps(ls, salon, STATS, TESTIMONIALS);
    if (render.layout === "masonry") {
      expect(ls.landing.gallery.galleryVariant).toBe("images-only");
      expect(render.props).toEqual(legacy.galleryMasonry);
    } else {
      expect(render.props).toEqual(legacy.galleryGrid);
    }
  });

  it("testimonials — jedan blok, produkcijska varijanta (kad je uključeno)", async () => {
    const { salon, data } = await blockDataFor(ls, {
      testimonials: SOME_TESTIMONIALS,
    });
    const block = data[sectionBlockId("testimonials")];

    // Posle normalizacije (spec 6.4) sekcija poštuje CMS toggle.
    if (!block) {
      expect(ls.landing.testimonials.enabled).toBe(false);
      return;
    }

    const render = theme2TestimonialsRender(
      block.data as ContentTestimonialsData,
      (block.config as TestimonialsBlockConfig).presentationVariant,
    );
    expect(render.variant).toBe("cards");
    expect(render.props).toEqual(
      legacyProps(ls, salon, STATS, SOME_TESTIMONIALS).testimonials,
    );
  });
});

describe("compat i normalizacija", () => {
  it("tri bezuslovne sekcije su razrešene", async () => {
    const { data } = await blockDataFor(SHISHAM);
    for (const source of ["hero", "about", "servicesPreview"]) {
      expect(data[sectionBlockId(source as never)], source).toBeDefined();
    }
  });

  it("bezuslovna sekcija nosi compat oznaku samo kad je CMS ugasio", async () => {
    const { data } = await blockDataFor(SHISHAM);
    // Kod ovog tenanta su hero/about/servicesPreview uključeni, pa dolaze
    // normalnim putem — compat postoji, ali nije potreban.
    expect(SHISHAM.landing.hero.enabled).toBe(true);
    expect(data[sectionBlockId("hero")]!.origin).toBeUndefined();
    expect(LEGACY_ALWAYS_ORIGIN).toBe("legacy-always");
  });

  it("utisci: Shi Sham ih je ugasio u CMS-u i sekcije više nema", async () => {
    expect(SHISHAM.landing.testimonials.enabled).toBe(false);
    const { data } = await blockDataFor(SHISHAM);
    expect(data[sectionBlockId("testimonials")]).toBeUndefined();
  });
});

describe("varijanta prikaza", () => {
  it("bira drugi prikaz kad je config tako kaže", async () => {
    const { data } = await blockDataFor(WITH_TESTIMONIALS);
    const block = data[sectionBlockId("testimonials")];
    expect(
      theme2TestimonialsRender(
        block!.data as ContentTestimonialsData,
        "highlights",
      ).variant,
    ).toBe("highlights");
  });

  it("bez zadate varijante pada na produkcijsku (cards)", async () => {
    const { data } = await blockDataFor(WITH_TESTIMONIALS);
    const block = data[sectionBlockId("testimonials")];
    expect(
      theme2TestimonialsRender(block!.data as ContentTestimonialsData, undefined)
        .variant,
    ).toBe("cards");
  });

  it("prazan spisak utisaka ide u prikaz nepromenjen (bez guarda)", async () => {
    const { data } = await blockDataFor(WITH_TESTIMONIALS, { testimonials: [] });
    const block = data[sectionBlockId("testimonials")];
    const render = theme2TestimonialsRender(
      block!.data as ContentTestimonialsData,
      "cards",
    );
    expect(render.props.testimonials).toEqual([]);
  });

  it("registry odbija nepoznatu varijantu", async () => {
    const { FEATURE_BLOCK_REGISTRY } = await import(
      "@/lib/platform/blocks/registry"
    );
    const parsed = FEATURE_BLOCK_REGISTRY.get("content.testimonials")!.parseConfig({
      source: "testimonials",
      presentationVariant: "editorial",
    });
    expect(parsed.ok).toBe(false);
  });
});
