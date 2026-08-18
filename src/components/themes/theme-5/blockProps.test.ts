/**
 * Theme5 migracija — regresija nad stvarnim tenantima + STRES-TEST compat sloja.
 *
 * theme-5 je ranije renderovala pet CMS sekcija bez obzira na `enabled`; posle
 * T2A-FOLLOWUP normalizacije (spec 6.4) sve poštuju svoj toggle.
 *
 * Referentna istina je `mapCMS(...)` — isti view model koji je tema koristila
 * pre migracije (commit f2b64f4). Ako bi poziv po sekciji dao drugu vrednost od
 * punog `mapCMS` poziva, ovi testovi padaju.
 */
import { describe, expect, it } from "vitest";
import type { IService, LandingStructure, SalonProfileData } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import fixtures from "@/lib/platform/__fixtures__/landing-structures.json";
import { mapCMS } from "@/lib/CMSMapper/mapCMS";
import {
  landingStructureToThemeDocument,
  sectionBlockId,
} from "@/lib/platform/theme-client";
import {
  preloadedBlockDataSource,
  resolveBlockData,
} from "@/lib/platform/blocks";
import type {
  BookingServicesData,
  ContentAboutData,
  ContentGalleryData,
  ContentHeroData,
  ContentTeamData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import {
  theme5AboutData,
  theme5ArtistsData,
  theme5BookingProps,
  theme5GalleryData,
  theme5HeroData,
  theme5ServicesData,
  theme5TestimonialsData,
} from "./blockProps";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);
const LASH_ROOM = tenants.find(([s]) => s === "the-lash-room-by-anja")![1];

const TENANT_SLUG = "demo-5";
const CLIENT_SLUG = "demo-5-client";
const SERVICES = [{ _id: "s1", name: "Trepavice" }] as unknown as IService[];
const TESTIMONIALS: PublicTestimonial[] = [
  { _id: "t1", clientName: "Mila", rating: 4, comment: "Sjajno" },
];
const STATS: TenantStats = {
  clientCount: 88,
  appointmentCount: 300,
  completedAppointmentCount: 260,
  averageRating: 4.9,
  reviewCount: 11,
};

function salonFor(ls: LandingStructure): SalonProfileData {
  return {
    _id: "salon-5",
    name: "Demo 5",
    email: "salon@example.com",
    description: "Studio",
    phone: "060/777-888",
    street: "Ulica 5",
    city: "Subotica",
    social: { instagram: "demo5_ig" },
    landingStructure: ls,
  } as unknown as SalonProfileData;
}

/** Zatečeni view model — referentna istina. */
function legacyUi(ls: LandingStructure, salon: SalonProfileData) {
  return mapCMS(salon, SERVICES, TESTIMONIALS, TENANT_SLUG, STATS);
}

async function blockDataFor(ls: LandingStructure) {
  const salon = salonFor(ls);
  const document = landingStructureToThemeDocument(ls, { theme: "theme-5" });
  const data = await resolveBlockData({
    document,
    theme: "theme-5",
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

describe.each(tenants)("%s — view model je identičan mapCMS-u", (slug, ls) => {
  it("hero", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("hero")];
    expect(block, slug).toBeDefined();
    expect(theme5HeroData(block!.data as ContentHeroData, TENANT_SLUG)).toEqual(
      legacyUi(ls, salon).hero,
    );
  });

  it("servicesPreview", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme5ServicesData(
        data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
      ),
    ).toEqual(legacyUi(ls, salon).services);
  });

  it("about", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme5AboutData(data[sectionBlockId("about")]!.data as ContentAboutData),
    ).toEqual(legacyUi(ls, salon).about);
  });

  it("gallery", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme5GalleryData(
        data[sectionBlockId("gallery")]!.data as ContentGalleryData,
      ),
    ).toEqual(legacyUi(ls, salon).gallery);
  });

  it("artists (kad je sekcija uključena)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("artists")];
    if (!block) {
      expect(ls.landing.artists.enabled).toBe(false);
      return;
    }
    expect(theme5ArtistsData(block.data as ContentTeamData)).toEqual(
      legacyUi(ls, salon).artists,
    );
  });

  it("testimonials (kad je sekcija uključena)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("testimonials")];
    if (!block) {
      expect(ls.landing.testimonials.enabled).toBe(false);
      return;
    }
    expect(
      theme5TestimonialsData(block.data as ContentTestimonialsData),
    ).toEqual(legacyUi(ls, salon).testimonials);
  });

  it("booking (kad je sekcija uključena)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("appointmentSection")];
    if (!block) {
      expect(ls.landing.appointmentSection.enabled).toBe(false);
      return;
    }
    expect(
      theme5BookingProps(
        block.data as BookingServicesData,
        TENANT_SLUG,
        CLIENT_SLUG,
      ),
    ).toEqual({
      tenantSlug: TENANT_SLUG,
      clientSlug: CLIENT_SLUG,
      salon,
      services: SERVICES,
    });
  });
});

/**
 * Poređenje sa `mapCMS` dokazuje RUTIRANJE (poziv po sekciji == pun poziv), ali
 * ne i sadržaj — obe strane koriste isti mapper, pa bi promena mappera prošla
 * neprimećeno. Zato su ovde ključne vrednosti prikovane doslovno.
 */
describe("prikovane vrednosti theme-5 view modela", () => {
  const [, base] = tenants[0];

  it("about statistika koristi appointmentCount, NE completedAppointmentCount", async () => {
    const { data } = await blockDataFor(base);
    const about = theme5AboutData(
      data[sectionBlockId("about")]!.data as ContentAboutData,
    );
    // theme-5 je jedina tema koja broji SVE termine, ne samo završene.
    expect(about.stats).toContainEqual({
      label: "Urađenih tretmana",
      value: "300+",
    });
    expect(about.stats).toContainEqual({
      label: "Zadovoljnih klijenata",
      value: "80+",
    });
  });

  it("gallery preuzima instagram link i ctaText iz CMS-a", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        gallery: {
          ...base.landing.gallery,
          instagram: {
            username: "@demo5",
            link: "https://instagram.com/demo5",
            ctaText: "Prati nas",
          },
        },
      },
    };
    const { data } = await blockDataFor(ls);
    const gallery = theme5GalleryData(
      data[sectionBlockId("gallery")]!.data as ContentGalleryData,
    );
    expect(gallery.instagramUrl).toBe("https://instagram.com/demo5");
    expect(gallery.instagramTag).toBe("Prati nas");
  });

  it("hero pada na ime salona kad CMS nema naslov", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        hero: { ...base.landing.hero, headline: undefined },
      },
    };
    const { data } = await blockDataFor(ls);
    const hero = theme5HeroData(
      data[sectionBlockId("hero")]!.data as ContentHeroData,
      TENANT_SLUG,
    );
    expect(hero.headline).toBe("Demo 5");
  });

  it("hero kontakt pada na salon telefon i adresu", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        hero: { ...base.landing.hero, contact: {} },
      },
    };
    const { data } = await blockDataFor(ls);
    const hero = theme5HeroData(
      data[sectionBlockId("hero")]!.data as ContentHeroData,
      TENANT_SLUG,
    );
    expect(hero.contact).toEqual({
      phone: "060/777-888",
      location: "Subotica, Ulica 5",
    });
  });
});

describe("normalizovano: pet nekada bezuslovnih sekcija", () => {
  const NEKADA_ALWAYS = [
    "hero",
    "servicesPreview",
    "appointmentSection",
    "about",
    "gallery",
  ] as const;

  it("uključene sekcije su razrešene kod svakog tenanta", async () => {
    for (const [slug, ls] of tenants) {
      const { data } = await blockDataFor(ls);
      for (const source of NEKADA_ALWAYS) {
        const enabled = ls.landing[source]?.enabled !== false;
        const has = Boolean(data[sectionBlockId(source)]);
        expect(has, `${slug}/${source}`).toBe(enabled);
      }
    }
  });

  it("Lash Room: ugašen appointmentSection više NE daje blok", async () => {
    expect(LASH_ROOM.landing.appointmentSection.enabled).toBe(false);
    const { data } = await blockDataFor(LASH_ROOM);
    expect(data[sectionBlockId("appointmentSection")]).toBeUndefined();
  });

  it("uključene sekcije istog tenanta i dalje imaju pune podatke", async () => {
    const { data } = await blockDataFor(LASH_ROOM);
    for (const source of ["hero", "about", "gallery", "servicesPreview"] as const) {
      expect(data[sectionBlockId(source)], source).toBeDefined();
    }
  });
});
