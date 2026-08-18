/**
 * Theme8 migracija — regresija PROPOVA nad stvarnim tenantima.
 *
 * Referentna istina je doslovna kopija JSX izraza iz `Theme8Landing` pre
 * migracije (commit 9d4fd2a).
 *
 * theme-8 je custom tema The Lash Room-a i ima najviše CMS-specifičnih polja
 * (Y2K wordmark, marquee, photo captions, perks CTA-ovi). Booking se ovde ne
 * pojavljuje kao blok — postoji kroz modal i /termini (spec 6.10).
 */
import { describe, expect, it } from "vitest";
import type { IService, LandingStructure, SalonProfileData } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import fixtures from "@/lib/platform/__fixtures__/landing-structures.json";
import {
  landingStructureToThemeDocument,
  sectionBlockId,
} from "@/lib/platform/theme-client";
import {
  preloadedBlockDataSource,
  resolveThemeBlockData,
} from "@/lib/platform/blocks";
import type {
  ContentAboutData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ContentPerksData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import {
  theme8AboutProps,
  theme8FaqProps,
  theme8GalleryProps,
  theme8HeroProps,
  theme8PerksProps,
  theme8ServicesCatalogProps,
  theme8TestimonialsProps,
} from "./blockProps";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);
const LASH_ROOM = tenants.find(([s]) => s === "the-lash-room-by-anja")![1];

const TENANT_SLUG = "the-lash-room-by-anja";
const SERVICES = [{ _id: "s1", name: "Klasične" }] as unknown as IService[];
const TESTIMONIALS: PublicTestimonial[] = [
  { _id: "t1", clientName: "Sara", rating: 5, comment: "Divno" },
];
const STATS: TenantStats = {
  clientCount: 150,
  appointmentCount: 500,
  completedAppointmentCount: 450,
  averageRating: 5,
  reviewCount: 4,
};

function resolveHref(href: string) {
  if (!href) return "#";
  if (/^https?:\/\//.test(href)) return href;
  return href.startsWith("/") ? `/${TENANT_SLUG}${href}` : `/${TENANT_SLUG}/${href}`;
}

function salonFor(ls: LandingStructure): SalonProfileData {
  return {
    _id: "salon-8",
    name: "The Lash Room",
    email: "salon@example.com",
    description: "Lash studio",
    phone: "060/121-212",
    street: "Ulica 8",
    city: "Novi Sad",
    social: { instagram: "lash_ig" },
    landingStructure: ls,
  } as unknown as SalonProfileData;
}

/** Doslovna kopija propova iz starog `Theme8Landing`. */
function legacyProps(
  ls: LandingStructure,
  salon: SalonProfileData,
  opts: { showFixtures?: boolean } = {},
) {
  const heroCtas = ls?.landing?.hero?.ctas;
  const aboutImage = ls?.landing?.about?.image?.src
    ? { src: ls.landing.about.image.src, alt: ls.landing.about.image.alt ?? "" }
    : undefined;
  return {
    hero: {
      heroData: {
        headline: ls?.landing?.hero?.headline,
        subheadline: ls?.landing?.hero?.subheadline,
        image: ls?.landing?.hero?.image,
        images: ls?.landing?.hero?.images,
      },
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
      salonName: salon.name,
      salonCity: salon.city,
      eyebrow: ls?.landing?.hero?.theme8?.eyebrow,
      wordmark: ls?.landing?.hero?.theme8?.wordmark,
      marquee: ls?.landing?.hero?.theme8?.marquee,
      photoCaptions: ls?.landing?.hero?.theme8?.photoCaptions,
      tenantStats: STATS,
      yearsOfExperience: ls?.landing?.about?.yearsOfExperience,
      openingYear: ls?.landing?.about?.openingYear,
    },
    about: {
      about: {
        headline: ls?.landing?.about?.headline,
        paragraphs: ls?.landing?.about?.paragraphs ?? [],
        links: ls?.landing?.about?.links ?? [],
        image: aboutImage,
        images: ls?.landing?.about?.images,
      },
      founderName: salon.name,
    },
    services: {
      services: SERVICES,
      tenantSlug: TENANT_SLUG,
      headline: ls?.landing?.servicesPreview?.headline,
      subheadline: ls?.landing?.servicesPreview?.subheadline,
    },
    gallery: {
      treatments: ls?.landing?.gallery?.treatments,
      headline: ls?.landing?.gallery?.headline,
      tenantSlug: TENANT_SLUG,
    },
    perks: {
      perks: {
        pill: ls?.landing?.perks?.pill,
        eyebrow: ls?.landing?.perks?.eyebrow,
        headline: ls?.landing?.perks?.headline,
        paragraphs: ls?.landing?.perks?.paragraphs ?? [],
        images: ls?.landing?.perks?.images,
        ctas: {
          primary: {
            text: ls?.landing?.perks?.ctas?.primary?.text ?? "",
            href: ls?.landing?.perks?.ctas?.primary?.href
              ? resolveHref(ls.landing.perks.ctas.primary.href)
              : "",
          },
          secondary: {
            text: ls?.landing?.perks?.ctas?.secondary?.text ?? "",
            href: ls?.landing?.perks?.ctas?.secondary?.href
              ? resolveHref(ls.landing.perks.ctas.secondary.href)
              : "",
          },
        },
      },
    },
    testimonials: {
      testimonials: TESTIMONIALS,
      tenantSlug: TENANT_SLUG,
      initialHasMore:
        (STATS.reviewCount ?? 0) > TESTIMONIALS.length ||
        (Boolean(opts.showFixtures) && TESTIMONIALS.length === 0),
      headline: ls?.landing?.testimonials?.headline,
    },
    faq: {
      items: ls?.landing?.faq?.items,
      headline: ls?.landing?.faq?.headline,
      supportText: ls?.landing?.faq?.support?.text,
    },
  };
}

async function blockDataFor(
  ls: LandingStructure,
  opts: { testimonials?: PublicTestimonial[]; stats?: TenantStats } = {},
) {
  const salon = salonFor(ls);
  const document = landingStructureToThemeDocument(ls, { theme: "theme-8" });
  const data = await resolveThemeBlockData({
    document,
    theme: "theme-8",
    tenantSlug: TENANT_SLUG,
    deps: preloadedBlockDataSource({
      salon,
      services: SERVICES,
      testimonials: opts.testimonials ?? TESTIMONIALS,
      tenantStats: opts.stats ?? STATS,
    }),
  });
  return { salon, data };
}

describe.each(tenants)("%s — propovi su identični starom putu", (slug, ls) => {
  it("hero (Y2K polja, metrike, staž)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("hero")];
    expect(block, slug).toBeDefined();
    expect(theme8HeroProps(block!.data as ContentHeroData, resolveHref)).toEqual(
      legacyProps(ls, salon).hero,
    );
  });

  it("about (uključujući images kolaž)", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme8AboutProps(data[sectionBlockId("about")]!.data as ContentAboutData),
    ).toEqual(legacyProps(ls, salon).about);
  });

  it("servicesPreview", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme8ServicesCatalogProps(
        data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
        TENANT_SLUG,
      ),
    ).toEqual(legacyProps(ls, salon).services);
  });

  it("gallery", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme8GalleryProps(
        data[sectionBlockId("gallery")]!.data as ContentGalleryData,
        TENANT_SLUG,
      ),
    ).toEqual(legacyProps(ls, salon).gallery);
  });

  it("testimonials (kad je sekcija uključena)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("testimonials")];
    if (!block) {
      expect(ls.landing.testimonials.enabled).toBe(false);
      return;
    }
    expect(
      theme8TestimonialsProps(block.data as ContentTestimonialsData, {
        tenantSlug: TENANT_SLUG,
      }),
    ).toEqual(legacyProps(ls, salon).testimonials);
  });

  it("faq", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme8FaqProps(data[sectionBlockId("faq")]!.data as ContentFaqData),
    ).toEqual(legacyProps(ls, salon).faq);
  });
});

describe("perks — prazan href se NE resolve-uje", () => {
  const base = LASH_ROOM;

  it("sa href-om: prefiksuje tenant slug", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        perks: {
          enabled: true,
          headline: "Pogodnosti",
          ctas: { primary: { text: "Registruj se", href: "/register" } },
        },
      },
    };
    const { data } = await blockDataFor(ls);
    const props = theme8PerksProps(
      data[sectionBlockId("perks")]!.data as ContentPerksData,
      resolveHref,
    );
    expect(props.perks.ctas.primary.href).toBe(`/${TENANT_SLUG}/register`);
  });

  it("bez href-a ostaje prazan string, ne '#'", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        perks: {
          enabled: true,
          ctas: { primary: { text: "Bez linka", href: "" } },
        },
      },
    };
    const { data } = await blockDataFor(ls);
    const props = theme8PerksProps(
      data[sectionBlockId("perks")]!.data as ContentPerksData,
      resolveHref,
    );
    expect(props.perks.ctas.primary.href).toBe("");
    expect(props.perks.ctas.secondary.href).toBe("");
  });
});

describe("testimonials initialHasMore", () => {
  it("true kad reviewCount premašuje prikazane", async () => {
    const ls: LandingStructure = {
      ...LASH_ROOM,
      landing: {
        ...LASH_ROOM.landing,
        testimonials: { ...LASH_ROOM.landing.testimonials, enabled: true },
      },
    };
    const { data } = await blockDataFor(ls);
    const props = theme8TestimonialsProps(
      data[sectionBlockId("testimonials")]!.data as ContentTestimonialsData,
      { tenantSlug: TENANT_SLUG },
    );
    // STATS.reviewCount = 4 > 1 prikazan
    expect(props.initialHasMore).toBe(true);
  });

  it("false kad je reviewCount JEDNAK broju prikazanih (granica > vs >=)", async () => {
    const ls: LandingStructure = {
      ...LASH_ROOM,
      landing: {
        ...LASH_ROOM.landing,
        testimonials: { ...LASH_ROOM.landing.testimonials, enabled: true },
      },
    };
    const { data } = await blockDataFor(ls, {
      stats: { ...STATS, reviewCount: TESTIMONIALS.length },
    });
    expect(
      theme8TestimonialsProps(
        data[sectionBlockId("testimonials")]!.data as ContentTestimonialsData,
        { tenantSlug: TENANT_SLUG },
      ).initialHasMore,
    ).toBe(false);
  });

  it("preview fixtures pale hasMore samo kad utisaka NEMA", async () => {
    const ls: LandingStructure = {
      ...LASH_ROOM,
      landing: {
        ...LASH_ROOM.landing,
        testimonials: { ...LASH_ROOM.landing.testimonials, enabled: true },
      },
    };
    const { data } = await blockDataFor(ls, { testimonials: [] });
    const block = data[sectionBlockId("testimonials")]!;
    expect(
      theme8TestimonialsProps(block.data as ContentTestimonialsData, {
        tenantSlug: TENANT_SLUG,
        showFixtures: true,
      }).initialHasMore,
    ).toBe(true);
  });
});

describe("booking nije blok u theme-8 (spec 6.10)", () => {
  it("Lash Room ima appointmentSection ugašen i tema ga ne renderuje", async () => {
    expect(LASH_ROOM.landing.appointmentSection.enabled).toBe(false);
    const { data } = await blockDataFor(LASH_ROOM);
    expect(data[sectionBlockId("appointmentSection")]).toBeUndefined();
  });

  it("nijedan blok ne dolazi compat putanjom", async () => {
    for (const [slug, ls] of tenants) {
      const { data } = await blockDataFor(ls);
      expect(Object.values(data).filter((b) => b.origin), slug).toEqual([]);
    }
  });
});
