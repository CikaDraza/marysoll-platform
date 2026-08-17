/**
 * Theme4 migracija — regresija PROPOVA nad stvarnim tenantima.
 *
 * Referentna istina je doslovna kopija JSX izraza iz `Theme4Landing` pre
 * migracije (commit 7266935).
 *
 * Naglasak je na trostrukom fallback-u statistike, koji nijedna druga tema nema:
 * metrike → CMS `landing.stats` → fiksne vrednosti teme.
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
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import {
  theme4AboutProps,
  theme4FaqProps,
  theme4GalleryRender,
  theme4HeroProps,
  theme4ServicesCatalogProps,
} from "./blockProps";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);

const TENANT_SLUG = "demo-4";
const SERVICES = [{ _id: "s1", name: "Masaža" }] as unknown as IService[];
const TESTIMONIALS: PublicTestimonial[] = [];
const STATS: TenantStats = {
  clientCount: 210,
  appointmentCount: 900,
  completedAppointmentCount: 780,
  averageRating: 4.8,
  reviewCount: 20,
};

function resolveHref(href: string) {
  if (!href) return "#";
  if (/^https?:\/\//.test(href)) return href;
  return href.startsWith("/") ? `/${TENANT_SLUG}${href}` : `/${TENANT_SLUG}/${href}`;
}

function salonFor(ls: LandingStructure): SalonProfileData {
  return {
    _id: "salon-4",
    name: "Demo 4",
    email: "salon@example.com",
    description: "Opis",
    phone: "060/333-444",
    street: "Ulica 4",
    city: "Beograd",
    social: { instagram: "demo4_ig" },
    landingStructure: ls,
  } as unknown as SalonProfileData;
}

/** Doslovna kopija propova iz starog `Theme4Landing`. */
function legacyProps(
  ls: LandingStructure,
  salon: SalonProfileData,
  tenantStats: TenantStats | undefined,
) {
  const heroCtas = ls?.landing?.hero?.ctas;
  const instagram = salon.social?.instagram || "";
  const primaryCta = {
    text: heroCtas?.primary?.text || "",
    href: resolveHref(heroCtas?.primary?.href || "/termini"),
  };
  return {
    hero: {
      headline: ls?.landing?.hero?.headline,
      subheadline: ls?.landing?.hero?.subheadline,
      imageMain: ls?.landing?.hero?.image,
      cta: primaryCta,
    },
    about: {
      headline: ls?.landing?.about?.headline || "O nama",
      paragraphs: ls?.landing?.about?.paragraphs || ["Saznajte više o nama"],
      links: ls?.landing?.about?.links ?? [],
      stats: tenantStats
        ? [
            {
              value: formatStatValue(tenantStats.clientCount),
              label: "Zadovoljnih klijenata",
            },
            {
              value: formatStatValue(tenantStats.completedAppointmentCount),
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
        : ls?.landing?.stats || [
            { value: "500+", label: "Zadovoljnih klijenata" },
            { value: "800+", label: "Urađenih tretmana" },
          ],
      image: ls?.landing?.about?.image,
    },
    services: {
      showIcons: ls?.landing?.servicesPreview?.showIcons ?? true,
      services: SERVICES,
      headline: ls?.landing?.servicesPreview?.headline,
      subheadline: ls?.landing?.servicesPreview?.subheadline,
      tenantSlug: TENANT_SLUG,
      imageUrl: ls?.landing?.servicesPreview?.image?.src,
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
      headline: ls?.landing?.faq?.headline,
      subheadline: ls?.landing?.faq?.subheadline,
      items: ls?.landing?.faq?.items,
      supportText: ls?.landing?.faq?.support?.text,
      supportEmail: ls?.landing?.faq?.support?.email,
    },
  };
}

/**
 * `opts` je objekat, ne opcioni parametar sa podrazumevanom vrednošću: poziv
 * `blockDataFor(ls, undefined)` bi aktivirao default i metrike se nikad ne bi
 * isključile — pa bi test „bez metrika" tiho testirao pogrešnu stvar.
 */
async function blockDataFor(
  ls: LandingStructure,
  opts: { tenantStats?: TenantStats } = {},
) {
  const tenantStats = "tenantStats" in opts ? opts.tenantStats : STATS;
  const salon = salonFor(ls);
  const document = landingStructureToThemeDocument(ls, { theme: "theme-4" });
  const data = await resolveThemeBlockData({
    document,
    theme: "theme-4",
    tenantSlug: TENANT_SLUG,
    deps: preloadedBlockDataSource({
      salon,
      services: SERVICES,
      testimonials: TESTIMONIALS,
      tenantStats,
    }),
  });
  return { salon, data };
}

describe.each(tenants)("%s — propovi su identični starom putu", (slug, ls) => {
  it("hero (theme-4 koristi samo primarni CTA)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("hero")];
    expect(block, slug).toBeDefined();
    expect(theme4HeroProps(block!.data as ContentHeroData, resolveHref)).toEqual(
      legacyProps(ls, salon, STATS).hero,
    );
  });

  it("about sa izmerenim metrikama", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("about")];
    expect(theme4AboutProps(block!.data as ContentAboutData)).toEqual(
      legacyProps(ls, salon, STATS).about,
    );
  });

  it("about BEZ metrika — fallback na CMS/fiksne vrednosti", async () => {
    const { salon, data } = await blockDataFor(ls, { tenantStats: undefined });
    const block = data[sectionBlockId("about")];
    expect(theme4AboutProps(block!.data as ContentAboutData)).toEqual(
      legacyProps(ls, salon, undefined).about,
    );
  });

  it("servicesPreview (sa slikom sekcije)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("servicesPreview")];
    expect(
      theme4ServicesCatalogProps(block!.data as ServicesCatalogData, TENANT_SLUG),
    ).toEqual(legacyProps(ls, salon, STATS).services);
  });

  it("gallery", async () => {
    const { salon, data } = await blockDataFor(ls);
    const render = theme4GalleryRender(
      data[sectionBlockId("gallery")]!.data as ContentGalleryData,
    );
    const legacy = legacyProps(ls, salon, STATS);
    expect(render.props).toEqual(
      render.layout === "masonry" ? legacy.galleryMasonry : legacy.galleryZigzag,
    );
  });

  it("faq", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme4FaqProps(data[sectionBlockId("faq")]!.data as ContentFaqData),
    ).toEqual(legacyProps(ls, salon, STATS).faq);
  });
});

describe("trostruki fallback statistike", () => {
  const [, base] = tenants[0];

  it("1. izmerene metrike imaju prednost", async () => {
    const { data } = await blockDataFor(base, { tenantStats: STATS });
    const props = theme4AboutProps(
      data[sectionBlockId("about")]!.data as ContentAboutData,
    );
    expect(props.stats[0].value).toBe(formatStatValue(STATS.clientCount));
  });

  it("2. bez metrika se koristi CMS `landing.stats`", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        stats: [{ value: "12", label: "Naših saradnika" }],
      },
    };
    const { data } = await blockDataFor(ls, { tenantStats: undefined });
    const props = theme4AboutProps(
      data[sectionBlockId("about")]!.data as ContentAboutData,
    );
    expect(props.stats).toEqual([{ value: "12", label: "Naših saradnika" }]);
  });

  it("3. bez oba se koriste fiksne vrednosti teme", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: { ...base.landing, stats: undefined as never },
    };
    const { data } = await blockDataFor(ls, { tenantStats: undefined });
    const props = theme4AboutProps(
      data[sectionBlockId("about")]!.data as ContentAboutData,
    );
    expect(props.stats).toEqual([
      { value: "500+", label: "Zadovoljnih klijenata" },
      { value: "800+", label: "Urađenih tretmana" },
    ]);
  });
});

describe("polja koja fixture ne pokriva", () => {
  const [, base] = tenants[0];

  /**
   * Nijedan produkcioni tenant nema `servicesPreview.image`, pa bi bez ovog
   * testa izostavljen prop prošao neprimećeno (mutation ga je otkrio).
   */
  it("servicesPreview.image ide u imageUrl", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        servicesPreview: {
          ...base.landing.servicesPreview,
          image: { src: "https://cdn.example.com/usluge.png", alt: "Usluge" },
        },
      },
    };
    const { data } = await blockDataFor(ls);
    const props = theme4ServicesCatalogProps(
      data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
      TENANT_SLUG,
    );
    expect(props.imageUrl).toBe("https://cdn.example.com/usluge.png");
  });

  it("showIcons kad ga CMS nije postavio → true (podrazumevano)", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        servicesPreview: {
          ...base.landing.servicesPreview,
          showIcons: undefined,
        },
      },
    };
    const { data } = await blockDataFor(ls);
    const props = theme4ServicesCatalogProps(
      data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
      TENANT_SLUG,
    );
    expect(props.showIcons).toBe(true);
  });

  it("showIcons: false se poštuje", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        servicesPreview: { ...base.landing.servicesPreview, showIcons: false },
      },
    };
    const { data } = await blockDataFor(ls);
    const props = theme4ServicesCatalogProps(
      data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
      TENANT_SLUG,
    );
    expect(props.showIcons).toBe(false);
  });
});

describe("theme-4 nema compat putanju", () => {
  it("nijedan blok ne dolazi compat putanjom", async () => {
    for (const [slug, ls] of tenants) {
      const { data } = await blockDataFor(ls);
      expect(Object.values(data).filter((b) => b.origin), slug).toEqual([]);
    }
  });

  it("isključen appointmentSection nema blok", async () => {
    const [, lashRoom] = tenants.find(([s]) => s === "the-lash-room-by-anja")!;
    const { data } = await blockDataFor(lashRoom);
    expect(data[sectionBlockId("appointmentSection")]).toBeUndefined();
  });
});
