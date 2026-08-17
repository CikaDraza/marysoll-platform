/**
 * Theme7 migracija — regresija PROPOVA nad stvarnim tenantima.
 *
 * Referentna istina je doslovna kopija JSX izraza iz `Theme7Landing` pre
 * migracije (commit fdc26ab).
 *
 * Specifičnost theme-7: booking je SLOT unutar hero-a (spec 6.10), pa je
 * `appointmentSection` bezuslovan — renderuje se kad god i hero.
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
  LEGACY_ALWAYS_ORIGIN,
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
  theme7AboutProps,
  theme7BookingProps,
  theme7FaqProps,
  theme7GalleryProps,
  theme7HeroProps,
  theme7ServicesCatalogProps,
  theme7TestimonialsProps,
} from "./blockProps";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);
const KIKI = tenants.find(([s]) => s === "kiki-kiss-beauty")![1];

const TENANT_SLUG = "kiki-kiss-beauty";
const CLIENT_SLUG = "kiki-client";
const SERVICES = [{ _id: "s1", name: "Trepavice" }] as unknown as IService[];
const TESTIMONIALS: PublicTestimonial[] = [
  { _id: "t1", clientName: "Iva", rating: 5, comment: "Top" },
];
const STATS: TenantStats = {
  clientCount: 120,
  appointmentCount: 400,
  completedAppointmentCount: 350,
  averageRating: 5,
  reviewCount: 14,
};

function resolveHref(href: string) {
  if (!href) return "#";
  if (/^https?:\/\//.test(href)) return href;
  return href.startsWith("/") ? `/${TENANT_SLUG}${href}` : `/${TENANT_SLUG}/${href}`;
}

function salonFor(ls: LandingStructure): SalonProfileData {
  return {
    _id: "salon-7",
    name: "Kiki Kiss",
    email: "salon@example.com",
    description: "Studio",
    phone: "060/999-000",
    street: "Ulica 7",
    city: "Beograd",
    social: { instagram: "kiki_ig" },
    landingStructure: ls,
  } as unknown as SalonProfileData;
}

/** Doslovna kopija propova iz starog `Theme7Landing`. */
function legacyProps(ls: LandingStructure, salon: SalonProfileData) {
  const heroCtas = ls?.landing?.hero?.ctas;
  const aboutImage = ls?.landing?.about?.image?.src
    ? {
        src: ls.landing.about.image.src,
        alt: ls.landing.about.image.alt ?? "",
      }
    : undefined;
  return {
    hero: {
      heroData: {
        headline: ls?.landing?.hero?.headline,
        subheadline: ls?.landing?.hero?.subheadline,
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
    testimonials: {
      testimonials: TESTIMONIALS.length > 0 ? TESTIMONIALS : undefined,
      headline: ls?.landing?.testimonials?.headline,
    },
    faq: {
      items: ls?.landing?.faq?.items,
      headline: ls?.landing?.faq?.headline,
      supportText: ls?.landing?.faq?.support?.text,
    },
    booking: {
      tenantSlug: TENANT_SLUG,
      clientSlug: CLIENT_SLUG,
      salon,
      services: SERVICES,
    },
  };
}

async function blockDataFor(ls: LandingStructure) {
  const salon = salonFor(ls);
  const document = landingStructureToThemeDocument(ls, { theme: "theme-7" });
  const data = await resolveThemeBlockData({
    document,
    theme: "theme-7",
    tenantSlug: TENANT_SLUG,
    deps: preloadedBlockDataSource({
      salon,
      services: SERVICES,
      testimonials: TESTIMONIALS,
      tenantStats: STATS,
    }),
  });
  return { salon, data };
}

describe.each(tenants)("%s — propovi su identični starom putu", (slug, ls) => {
  it("hero (metrike i staž stižu kroz podatke bloka)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("hero")];
    expect(block, slug).toBeDefined();
    expect(theme7HeroProps(block!.data as ContentHeroData, resolveHref)).toEqual(
      legacyProps(ls, salon).hero,
    );
  });

  it("about (founderName iz imena salona)", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme7AboutProps(data[sectionBlockId("about")]!.data as ContentAboutData),
    ).toEqual(legacyProps(ls, salon).about);
  });

  it("servicesPreview", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme7ServicesCatalogProps(
        data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
        TENANT_SLUG,
      ),
    ).toEqual(legacyProps(ls, salon).services);
  });

  it("gallery (samo tretmani, bez varijanti)", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme7GalleryProps(
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
      theme7TestimonialsProps(block.data as ContentTestimonialsData),
    ).toEqual(legacyProps(ls, salon).testimonials);
  });

  it("faq", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme7FaqProps(data[sectionBlockId("faq")]!.data as ContentFaqData),
    ).toEqual(legacyProps(ls, salon).faq);
  });

  it("booking je uvek razrešen — slot u hero-u", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("appointmentSection")];
    expect(block, slug).toBeDefined();
    expect(
      theme7BookingProps(
        block!.data as BookingServicesData,
        TENANT_SLUG,
        CLIENT_SLUG,
      ),
    ).toEqual(legacyProps(ls, salon).booking);
  });
});

describe("booking kao slot (spec 6.10)", () => {
  it("Kiki Kiss ima appointmentSection uključen — blok NIJE compat", async () => {
    expect(KIKI.landing.appointmentSection.enabled).toBe(true);
    const { data } = await blockDataFor(KIKI);
    expect(data[sectionBlockId("appointmentSection")]!.origin).toBeUndefined();
  });

  it("kad je sekcija ugašena, compat je i dalje drži (booking je u hero-u)", async () => {
    const [, lashRoom] = tenants.find(([s]) => s === "the-lash-room-by-anja")!;
    expect(lashRoom.landing.appointmentSection.enabled).toBe(false);
    const { data } = await blockDataFor(lashRoom);
    const block = data[sectionBlockId("appointmentSection")];
    expect(block!.origin).toBe(LEGACY_ALWAYS_ORIGIN);
    expect((block!.data as BookingServicesData).services).toEqual(SERVICES);
  });

  it("compat nosi TAČNO booking, ništa drugo", async () => {
    const [, lashRoom] = tenants.find(([s]) => s === "the-lash-room-by-anja")!;
    const { data } = await blockDataFor(lashRoom);
    const compat = Object.entries(data)
      .filter(([, b]) => b.origin)
      .map(([id]) => id);
    expect(compat).toEqual([sectionBlockId("appointmentSection")]);
  });
});

describe("prazna stanja", () => {
  it("bez usluga se sekcija usluga ne prikazuje", async () => {
    const salon = salonFor(KIKI);
    const document = landingStructureToThemeDocument(KIKI, { theme: "theme-7" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-7",
      deps: preloadedBlockDataSource({
        salon,
        services: [],
        testimonials: TESTIMONIALS,
        tenantStats: STATS,
      }),
    });
    expect(
      theme7ServicesCatalogProps(
        data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
        TENANT_SLUG,
      ),
    ).toBeNull();
  });

  it("about bez slike → image undefined, ne prazan objekat", async () => {
    const ls: LandingStructure = {
      ...KIKI,
      landing: {
        ...KIKI.landing,
        about: { ...KIKI.landing.about, image: undefined },
      },
    };
    const { data } = await blockDataFor(ls);
    expect(
      theme7AboutProps(data[sectionBlockId("about")]!.data as ContentAboutData)
        .about.image,
    ).toBeUndefined();
  });
});
