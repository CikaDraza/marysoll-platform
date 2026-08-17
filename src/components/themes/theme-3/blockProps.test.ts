/**
 * Theme3 migracija — regresija PROPOVA nad stvarnim tenantima.
 *
 * Referentna istina je doslovna kopija JSX izraza iz `Theme3Landing` pre
 * migracije (commit 3487cdc).
 *
 * theme-3 nema nijednu bezuslovnu sekciju, pa ovde nema compat putanje — sve
 * zavisi isključivo od postojanja bloka u dokumentu.
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
  preloadedBlockDataSource,
  resolveThemeBlockData,
} from "@/lib/platform/blocks";
import type {
  ContentAboutData,
  ContentBlogData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import {
  theme3AboutProps,
  theme3BlogProps,
  theme3FaqProps,
  theme3GalleryRender,
  theme3HeroProps,
  theme3ServicesCatalogProps,
} from "./blockProps";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);

const TENANT_SLUG = "demo-salon";
const SERVICES = [{ _id: "s1", name: "Tretman" }] as unknown as IService[];
const TESTIMONIALS: PublicTestimonial[] = [];
const STATS: TenantStats = {
  clientCount: 42,
  appointmentCount: 100,
  completedAppointmentCount: 88,
  averageRating: 5,
  reviewCount: 3,
};

function resolveHref(href: string) {
  if (!href) return "#";
  if (/^https?:\/\//.test(href)) return href;
  return href.startsWith("/") ? `/${TENANT_SLUG}${href}` : `/${TENANT_SLUG}/${href}`;
}

function salonFor(ls: LandingStructure): SalonProfileData {
  return {
    _id: "salon-3",
    name: "Demo Salon",
    email: "salon@example.com",
    description: "Opis salona",
    phone: "060/111-222",
    street: "Ulica 3",
    city: "Novi Sad",
    logo: "https://cdn.example.com/logo.png",
    social: { instagram: "demo_ig" },
    landingStructure: ls,
  } as unknown as SalonProfileData;
}

/** Doslovna kopija propova iz starog `Theme3Landing`. */
function legacyProps(
  ls: LandingStructure,
  salon: SalonProfileData,
  stats: TenantStats | undefined,
) {
  const heroCtas = ls?.landing?.hero?.ctas;
  const instagram = salon.social?.instagram || "";
  return {
    hero: {
      headline: ls?.landing?.hero?.headline,
      subheadline: ls?.landing?.hero?.subheadline,
      imageMain: ls?.landing?.hero?.image,
      imageGrid: ls?.landing?.hero?.images,
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
      about: {
        headline: ls?.landing?.about?.headline,
        paragraphs: ls?.landing?.about?.paragraphs ?? [],
        links: ls?.landing?.about?.links ?? [],
        image: ls?.landing?.about?.image,
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
    },
    services: {
      services: SERVICES,
      headline: ls?.landing?.servicesPreview?.headline,
      subheadline: ls?.landing?.servicesPreview?.subheadline,
      tenantSlug: TENANT_SLUG,
    },
    galleryMasonry: {
      images: ls?.landing?.gallery?.images,
      headline: ls?.landing?.gallery?.headline,
    },
    galleryZigzag: {
      instagramUrl: ls?.landing?.gallery?.instagram?.link || instagram,
      instagramTag: ls?.landing?.gallery?.instagram?.username || instagram,
      headline: ls?.landing?.gallery?.headline,
      subheadline: ls?.landing?.gallery?.subheadline,
      treatments:
        ls?.landing?.gallery?.treatments &&
        ls.landing.gallery.treatments.length > 0
          ? ls.landing.gallery.treatments
          : undefined,
    },
    faq: {
      items: ls?.landing?.faq?.items,
      headline: ls?.landing?.faq?.headline,
    },
    blog: {
      headline: ls?.landing?.blog?.headline,
      paragraph: ls?.landing?.blog?.paragraph,
      tenantSlug: TENANT_SLUG,
      authorName: salon.name,
      authorImage: salon.logo ?? undefined,
    },
  };
}

async function blockDataFor(ls: LandingStructure) {
  const salon = salonFor(ls);
  const document = landingStructureToThemeDocument(ls, { theme: "theme-3" });
  const data = await resolveThemeBlockData({
    document,
    theme: "theme-3",
    tenantSlug: TENANT_SLUG,
    deps: preloadedBlockDataSource({
      salon,
      services: SERVICES,
      testimonials: TESTIMONIALS,
      tenantStats: STATS,
    }),
  });
  return { salon, document, data };
}

describe.each(tenants)("%s — propovi su identični starom putu", (slug, ls) => {
  it("hero", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("hero")];
    expect(block, slug).toBeDefined();
    expect(theme3HeroProps(block!.data as ContentHeroData, resolveHref)).toEqual(
      legacyProps(ls, salon, STATS).hero,
    );
  });

  it("about (sa metrikama)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("about")];
    expect(theme3AboutProps(block!.data as ContentAboutData)).toEqual(
      legacyProps(ls, salon, STATS).about,
    );
  });

  it("servicesPreview", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("servicesPreview")];
    expect(
      theme3ServicesCatalogProps(block!.data as ServicesCatalogData, TENANT_SLUG),
    ).toEqual(legacyProps(ls, salon, STATS).services);
  });

  it("gallery — ista varijanta i isti propovi", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("gallery")];
    const render = theme3GalleryRender(block!.data as ContentGalleryData);
    const legacy = legacyProps(ls, salon, STATS);
    if (render.layout === "masonry") {
      expect(render.props).toEqual(legacy.galleryMasonry);
    } else {
      expect(render.props).toEqual(legacy.galleryZigzag);
    }
  });

  it("faq", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("faq")];
    expect(theme3FaqProps(block!.data as ContentFaqData)).toEqual(
      legacyProps(ls, salon, STATS).faq,
    );
  });
});

describe("theme-3 poštuje sve svoje flagove — nema compat putanje", () => {
  const [, lashRoom] = tenants.find(([s]) => s === "the-lash-room-by-anja")!;
  const [, kiki] = tenants.find(([s]) => s === "kiki-kiss-beauty")!;

  it("nijedan blok ne dolazi compat putanjom", async () => {
    for (const [slug, ls] of tenants) {
      const { data } = await blockDataFor(ls);
      expect(
        Object.values(data).filter((b) => b.origin),
        slug,
      ).toEqual([]);
    }
  });

  it("isključen appointmentSection nema blok", async () => {
    expect(lashRoom.landing.appointmentSection.enabled).toBe(false);
    const { data } = await blockDataFor(lashRoom);
    expect(data[sectionBlockId("appointmentSection")]).toBeUndefined();
  });

  it("isključeni utisci nemaju blok", async () => {
    expect(kiki.landing.testimonials.enabled).toBe(false);
    const { data } = await blockDataFor(kiki);
    expect(data[sectionBlockId("testimonials")]).toBeUndefined();
  });

  it("blog je po defaultu isključen kod svih tenanta", async () => {
    for (const [slug, ls] of tenants) {
      const { data } = await blockDataFor(ls);
      expect(data[sectionBlockId("blog")], slug).toBeUndefined();
    }
  });
});

describe("blog blok nosi autora iz salona", () => {
  it("kad je uključen, autor je ime + logo salona", async () => {
    const [, base] = tenants[0];
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        blog: { enabled: true, headline: "Naš blog", paragraph: "Tekst" },
      },
    };
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("blog")];
    expect(block).toBeDefined();
    expect(theme3BlogProps(block!.data as ContentBlogData, TENANT_SLUG)).toEqual(
      legacyProps(ls, salon, STATS).blog,
    );
  });

  it("salon bez logotipa → authorImage undefined", async () => {
    const [, base] = tenants[0];
    const ls: LandingStructure = {
      ...base,
      landing: { ...base.landing, blog: { enabled: true } },
    };
    const document = landingStructureToThemeDocument(ls, { theme: "theme-3" });
    const salon = { ...salonFor(ls), logo: null } as SalonProfileData;
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-3",
      tenantSlug: TENANT_SLUG,
      deps: preloadedBlockDataSource({
        salon,
        services: SERVICES,
        testimonials: TESTIMONIALS,
        tenantStats: STATS,
      }),
    });
    const props = theme3BlogProps(
      data[sectionBlockId("blog")]!.data as ContentBlogData,
      TENANT_SLUG,
    );
    expect(props.authorImage).toBeUndefined();
    expect(props.authorName).toBe("Demo Salon");
  });
});
