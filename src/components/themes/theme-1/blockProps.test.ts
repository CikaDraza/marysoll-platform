/**
 * Theme1 migracija — regresija PROPOVA nad stvarnim tenantima.
 *
 * Referentna istina je doslovna kopija JSX izraza iz `Theme1Landing` pre
 * migracije (commit 2950d72). Ako novi put promeni ijedan prop — zamenjen
 * `headline`/`subheadline`, izgubljen fallback, drugačiji uslov za prazno
 * stanje — ovaj test pada.
 *
 * Ovo ne zamenjuje vizuelnu i LCP regresiju; hvata ono što DOM screenshot teško
 * primeti: tiho promenjenu vrednost propa.
 */
import { describe, expect, it } from "vitest";
import type { IService, LandingStructure, SalonProfileData } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import fixtures from "@/lib/platform/__fixtures__/landing-structures.json";
import { landingStructureToThemeDocument, sectionBlockId } from "@/lib/platform/theme-client";
import {
  preloadedBlockDataSource,
  resolveThemeBlockData,
} from "@/lib/platform/blocks";
import type {
  BookingServicesData,
  ContentAboutData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import {
  theme1AboutProps,
  theme1BookingProps,
  theme1FaqProps,
  theme1GalleryRender,
  theme1HeroProps,
  theme1ServicesCatalogProps,
  theme1TestimonialsProps,
} from "./blockProps";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);

const TENANT_SLUG = "kiki-makeup";
const CLIENT_SLUG = "kiki-makeup-client";

const SERVICES = [
  { _id: "s1", name: "Klasične trepavice" },
  { _id: "s2", name: "Volumen" },
] as unknown as IService[];

const TESTIMONIALS: PublicTestimonial[] = [
  { _id: "t1", clientName: "Ana", rating: 5, comment: "Odlično" },
];

/** Doslovna kopija `resolveHref` iz ThemeLayout-a (l. 70–75). */
function resolveHref(href: string) {
  if (!href) return "#";
  if (/^https?:\/\//.test(href)) return href;
  const prefix = TENANT_SLUG ? `/${TENANT_SLUG}` : "";
  return href.startsWith("/") ? `${prefix}${href}` : `${prefix}/${href}`;
}

function salonFor(ls: LandingStructure): SalonProfileData {
  return {
    _id: "salon-1",
    name: "Salon",
    email: "salon@example.com",
    description: "",
    phone: "",
    street: "",
    city: "",
    social: { instagram: "salon_ig", facebook: "salon_fb" },
    landingStructure: ls,
  } as unknown as SalonProfileData;
}

/**
 * Referentna istina: propovi kakve je STARI `Theme1Landing` slao, prepisani
 * doslovno iz JSX-a. `salonWithMergedSocial` je merge iz ThemeLayout-a (l. 77–87).
 */
function legacyProps(ls: LandingStructure, salon: SalonProfileData) {
  const heroSL = ls?.landing?.hero?.socialLinks;
  const salonWithMergedSocial = {
    ...salon,
    social: {
      ...salon.social,
      ...(heroSL?.instagram ? { instagram: heroSL.instagram } : {}),
      ...(heroSL?.facebook ? { facebook: heroSL.facebook } : {}),
      ...(heroSL?.tiktok ? { tiktok: heroSL.tiktok } : {}),
      ...(heroSL?.whatsapp ? { whatsapp: heroSL.whatsapp } : {}),
      ...(heroSL?.telegram ? { telegram: heroSL.telegram } : {}),
    },
  };

  const heroCtas = ls?.landing?.hero?.ctas;
  const instagram = salon.social?.instagram || "";

  return {
    hero: {
      salon: salonWithMergedSocial,
      heroData: {
        headline: ls?.landing?.hero?.headline ?? "",
        subheadline: ls?.landing?.hero?.subheadline,
        whereWhatForWhom: ls?.landing?.hero?.whereWhatForWhom,
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
    },
    about: {
      about: {
        headline: ls?.landing?.about?.headline,
        paragraphs: ls?.landing?.about?.paragraphs ?? [],
        links: ls?.landing?.about?.links ?? [],
        image: {
          src: ls?.landing?.about?.image?.src ?? "",
          alt: ls?.landing?.about?.image?.alt ?? "",
        },
      },
    },
    services: {
      services: SERVICES,
      headline: ls?.landing?.servicesPreview?.headline,
      subheadline: ls?.landing?.servicesPreview?.subheadline,
      tenantSlug: TENANT_SLUG,
    },
    booking: {
      tenantSlug: TENANT_SLUG,
      clientSlug: CLIENT_SLUG ?? TENANT_SLUG,
      salon,
      services: SERVICES,
      headline: ls?.landing?.appointmentSection?.headline,
      subheadline: ls?.landing?.appointmentSection?.subheadline,
      instructions: ls?.landing?.appointmentSection?.instructions,
    },
    testimonials: {
      testimonials: TESTIMONIALS.length > 0 ? TESTIMONIALS : undefined,
      headline: ls?.landing?.testimonials?.headline,
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

async function blockDataFor(ls: LandingStructure) {
  const salon = salonFor(ls);
  const document = landingStructureToThemeDocument(ls, { theme: "theme-1" });
  const data = await resolveThemeBlockData({
    document,
    theme: "theme-1",
    tenantSlug: TENANT_SLUG,
    deps: preloadedBlockDataSource({
      salon,
      services: SERVICES,
      testimonials: TESTIMONIALS,
    }),
  });
  return { salon, document, data };
}

describe.each(tenants)("%s — propovi su identični starom putu", (slug, ls) => {
  it("hero", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("hero")];
    expect(block, slug).toBeDefined();
    expect(
      theme1HeroProps(block!.data as ContentHeroData, resolveHref),
    ).toEqual(legacyProps(ls, salon).hero);
  });

  it("about", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("about")];
    expect(theme1AboutProps(block!.data as ContentAboutData)).toEqual(
      legacyProps(ls, salon).about,
    );
  });

  it("servicesPreview", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("servicesPreview")];
    expect(
      theme1ServicesCatalogProps(
        block!.data as ServicesCatalogData,
        TENANT_SLUG,
      ),
    ).toEqual(legacyProps(ls, salon).services);
  });

  it("testimonials (kad je sekcija uključena)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("testimonials")];
    if (!block) {
      expect(ls.landing.testimonials.enabled).toBe(false);
      return;
    }
    expect(
      theme1TestimonialsProps(block.data as ContentTestimonialsData),
    ).toEqual(legacyProps(ls, salon).testimonials);
  });

  it("appointmentSection (kad je sekcija uključena)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("appointmentSection")];
    if (!block) {
      expect(ls.landing.appointmentSection.enabled).toBe(false);
      return;
    }
    expect(
      theme1BookingProps(
        block.data as BookingServicesData,
        TENANT_SLUG,
        CLIENT_SLUG,
      ),
    ).toEqual(legacyProps(ls, salon).booking);
  });

  it("gallery — ista varijanta i isti propovi", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("gallery")];
    const render = theme1GalleryRender(block!.data as ContentGalleryData);
    const legacy = legacyProps(ls, salon);

    // theme-1 podrazumevano ide na "images-with-category" (zigzag), osim ako
    // CMS eksplicitno kaže drugačije — isto kao THEME_GALLERY_DEFAULTS.
    if (render.layout === "masonry") {
      expect(ls.landing.gallery.galleryVariant).toBe("images-only");
      expect(render.props).toEqual(legacy.galleryMasonry);
    } else {
      expect(render.props).toEqual(legacy.galleryZigzag);
    }
  });

  it("faq", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("faq")];
    expect(theme1FaqProps(block!.data as ContentFaqData)).toEqual(
      legacyProps(ls, salon).faq,
    );
  });
});

describe("granični slučajevi koje stari put jeste imao", () => {
  const [, ls] = tenants[0];

  it("bez usluga se services sekcija ne prikazuje", async () => {
    const document = landingStructureToThemeDocument(ls, { theme: "theme-1" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-1",
      deps: preloadedBlockDataSource({
        salon: salonFor(ls),
        services: [],
        testimonials: TESTIMONIALS,
      }),
    });

    const block = data[sectionBlockId("servicesPreview")];
    expect(block).toBeDefined();
    expect(
      theme1ServicesCatalogProps(block!.data as ServicesCatalogData, TENANT_SLUG),
    ).toBeNull();
  });

  it("bez utisaka prop ostaje undefined, ne prazan niz", async () => {
    const document = landingStructureToThemeDocument(ls, { theme: "theme-1" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-1",
      deps: preloadedBlockDataSource({
        salon: salonFor(ls),
        services: SERVICES,
        testimonials: [],
      }),
    });

    const block = data[sectionBlockId("testimonials")];
    if (!block) return; // sekcija je kod ovog tenanta isključena
    expect(
      theme1TestimonialsProps(block.data as ContentTestimonialsData).testimonials,
    ).toBeUndefined();
  });

  it("clientSlug pada nazad na tenantSlug kad ga nema", async () => {
    const { data } = await blockDataFor(ls);
    const block = data[sectionBlockId("appointmentSection")];
    if (!block) return;
    expect(
      theme1BookingProps(block.data as BookingServicesData, TENANT_SLUG).clientSlug,
    ).toBe(TENANT_SLUG);
  });
});
