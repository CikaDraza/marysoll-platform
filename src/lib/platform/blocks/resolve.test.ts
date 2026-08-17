/**
 * Server prolaz kroz blokove — nad STVARNIM tenant podacima.
 *
 * Dokazuje tri stvari koje su uslov za migraciju tema:
 *   1. podaci koje blok dobije su isti oni koje danas dobija sekcija teme;
 *   2. loaderi se izvršavaju paralelno, uz dedupe resursa (spec 5.2);
 *   3. bezuslovne sekcije (inventar 6.1) dobijaju podatke i kad su `enabled:
 *      false` — inače bi theme-2/5/7 posle migracije imale prazne sekcije.
 */
import { describe, expect, it, vi } from "vitest";
import type { ThemeDocument } from "@panta/theme-engine";
import type { IService, LandingStructure, SalonProfileData } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import fixtures from "../__fixtures__/landing-structures.json";
import {
  landingStructureToThemeDocument,
  sectionBlockId,
} from "../theme-client";
import { createBlockDataSource, preloadedBlockDataSource } from "./deps";
import { createFeatureBlockRegistry } from "./registry";
import { resolveBlockData } from "./resolve";
import { LEGACY_ALWAYS_ORIGIN, resolveThemeBlockData } from "./theme-render";
import type {
  BookingServicesData,
  ContentAboutData,
  ContentGalleryData,
  ContentHeroData,
  ContentTestimonialsData,
  FeatureBlockDefinition,
  FeatureBlockType,
  ServicesCatalogData,
} from "./types";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);

const SERVICES = [
  { _id: "s1", name: "Klasične trepavice", price: 3000 },
  { _id: "s2", name: "Volumen", price: 4000 },
] as unknown as IService[];

const TESTIMONIALS: PublicTestimonial[] = [
  { _id: "t1", clientName: "Ana", rating: 5, comment: "Odlično" },
];

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

function depsFor(ls: LandingStructure) {
  return preloadedBlockDataSource({
    salon: salonFor(ls),
    services: SERVICES,
    testimonials: TESTIMONIALS,
  });
}

describe("paritet podataka nad stvarnim tenantima", () => {
  for (const [slug, ls] of tenants) {
    it(`${slug}: svaki vidljivi blok dobije sadržaj svoje CMS sekcije`, async () => {
      const document = landingStructureToThemeDocument(ls, { theme: "theme-1" });
      const data = await resolveThemeBlockData({
        document,
        theme: "theme-1",
        deps: depsFor(ls),
      });

      // Isti skup blokova kao u dokumentu — ni jedan više, ni jedan manje.
      expect(Object.keys(data).sort()).toEqual(
        document.sections.flatMap((s) => s.blocks.map((b) => b.id)).sort(),
      );

      const hero = data[sectionBlockId("hero")]?.data as ContentHeroData;
      expect(hero.content).toEqual(ls.landing.hero);
      // Hero social: CMS pobeđuje samo kad je vrednost neprazna.
      expect(hero.salon.social.instagram).toBe(
        ls.landing.hero.socialLinks?.instagram || "salon_ig",
      );

      const services = data[sectionBlockId("servicesPreview")]
        ?.data as ServicesCatalogData;
      expect(services.services).toEqual(SERVICES);
      expect(services.content).toEqual(ls.landing.servicesPreview);

      const gallery = data[sectionBlockId("gallery")]?.data as ContentGalleryData;
      expect(gallery.content).toEqual(ls.landing.gallery);
      expect(gallery.instagramFallback).toBe("salon_ig");
      expect(["images-only", "images-with-category"]).toContain(
        gallery.galleryVariant,
      );
    });
  }

  it("isključena sekcija nema blok (theme-1 poštuje flagove)", async () => {
    const [, ls] = tenants.find(([s]) => s === "the-lash-room-by-anja")!;
    const document = landingStructureToThemeDocument(ls, { theme: "theme-1" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-1",
      deps: depsFor(ls),
    });

    expect(ls.landing.appointmentSection.enabled).toBe(false);
    expect(data[sectionBlockId("appointmentSection")]).toBeUndefined();
  });

  it("testimonials blok nosi i CMS naslov i zapise iz baze", async () => {
    const [, ls] = tenants.find(([s]) => s === "marysoll-makeup-nails")!;
    const document = landingStructureToThemeDocument(ls, { theme: "theme-1" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-1",
      deps: depsFor(ls),
    });

    const block = data[sectionBlockId("testimonials")]
      ?.data as ContentTestimonialsData;
    expect(block.testimonials).toEqual(TESTIMONIALS);
    expect(block.content).toEqual(ls.landing.testimonials);
  });
});

describe("legacy-always compat (inventar 6.1)", () => {
  const [, lashRoom] = tenants.find(([s]) => s === "the-lash-room-by-anja")!;
  const [, kiki] = tenants.find(([s]) => s === "kiki-kiss-beauty")!;

  it("theme-5 dobija appointmentSection iako je enabled=false", async () => {
    const document = landingStructureToThemeDocument(lashRoom, { theme: "theme-5" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-5",
      deps: depsFor(lashRoom),
    });

    const booking = data[sectionBlockId("appointmentSection")];
    expect(booking).toBeDefined();
    expect(booking!.origin).toBe(LEGACY_ALWAYS_ORIGIN);
    // Isti registry, isti loader — compat blok ima pune podatke, ne prazan objekat.
    const bookingData = booking!.data as BookingServicesData;
    expect(bookingData.services).toEqual(SERVICES);
    expect(bookingData.content).toEqual(lashRoom.landing.appointmentSection);
  });

  it("theme-7 isto (booking je slot u hero sekciji)", async () => {
    const document = landingStructureToThemeDocument(lashRoom, { theme: "theme-7" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-7",
      deps: depsFor(lashRoom),
    });
    expect(data[sectionBlockId("appointmentSection")]?.origin).toBe(
      LEGACY_ALWAYS_ORIGIN,
    );
  });

  it("theme-2 dobija about iako je to sekcija koju CMS može da ugasi", async () => {
    const document = landingStructureToThemeDocument(kiki, { theme: "theme-2" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-2",
      deps: depsFor(kiki),
    });

    const block = data[sectionBlockId("about")];
    expect(block).toBeDefined();
    expect((block!.data as ContentAboutData).content).toEqual(kiki.landing.about);
  });

  it("theme-2 utisci VIŠE nisu compat — sekcija poštuje CMS toggle", async () => {
    // Normalizacija po odluci vlasnika (spec 6.4): ranije se prazna sekcija
    // prikazivala uprkos isključenom toggle-u.
    const document = landingStructureToThemeDocument(kiki, { theme: "theme-2" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-2",
      deps: depsFor(kiki),
    });

    expect(kiki.landing.testimonials.enabled).toBe(false);
    expect(data[sectionBlockId("testimonials")]).toBeUndefined();
  });

  it("theme-1/3/4/6/8 ne dobijaju nijedan compat blok", async () => {
    for (const theme of ["theme-1", "theme-3", "theme-4", "theme-6", "theme-8"]) {
      const document = landingStructureToThemeDocument(lashRoom, { theme });
      const data = await resolveThemeBlockData({
        document,
        theme,
        deps: depsFor(lashRoom),
      });
      const compat = Object.values(data).filter((b) => b.origin);
      expect(compat, theme).toEqual([]);
    }
  });

  it("compat ne duplira blok koji je već u dokumentu", async () => {
    // Kod ovog tenanta je gallery uključen, a theme-5 ga renderuje bezuslovno.
    const document = landingStructureToThemeDocument(kiki, { theme: "theme-5" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-5",
      deps: depsFor(kiki),
    });

    expect(kiki.landing.gallery.enabled).toBe(true);
    expect(data[sectionBlockId("gallery")]?.origin).toBeUndefined();
  });

  it("običan resolveBlockData NE zna za compat — bezuslovne sekcije izostaju", async () => {
    const document = landingStructureToThemeDocument(lashRoom, { theme: "theme-5" });
    const data = await resolveBlockData({
      document,
      theme: "theme-5",
      deps: depsFor(lashRoom),
    });
    expect(data[sectionBlockId("appointmentSection")]).toBeUndefined();
  });
});

describe("bez waterfall-a (spec 5.2)", () => {
  it("resurs se povlači jednom, ma koliko blokova ga tražilo", async () => {
    // Tenant sa uključenim utiscima, da svih pet resursa bude zatraženo.
    const [, ls] = tenants.find(([s]) => s === "marysoll-makeup-nails")!;
    const landingStructure = vi.fn(async () => ls);
    const salon = vi.fn(async () => salonFor(ls));
    const services = vi.fn(async () => SERVICES);
    const testimonials = vi.fn(async () => TESTIMONIALS);
    const tenantStats = vi.fn(async () => undefined);

    const document = landingStructureToThemeDocument(ls, { theme: "theme-2" });
    const data = await resolveThemeBlockData({
      document,
      theme: "theme-2",
      deps: createBlockDataSource({
        landingStructure,
        salon,
        services,
        testimonials,
        tenantStats,
      }),
    });

    // 8 blokova čita landingStructure, tri traže salon, dva services.
    expect(Object.keys(data).length).toBeGreaterThan(5);
    expect(landingStructure).toHaveBeenCalledTimes(1);
    expect(salon).toHaveBeenCalledTimes(1);
    expect(services).toHaveBeenCalledTimes(1);
    expect(testimonials).toHaveBeenCalledTimes(1);
    expect(tenantStats).toHaveBeenCalledTimes(1);
  });

  it("loaderi teku paralelno, ne jedan za drugim", async () => {
    // Svaki loader čeka da SVI krenu. Sekvencijalno izvršavanje bi se zaglavilo
    // na prvom bloku i test bi pao na timeout-u.
    const EXPECTED = 3;
    let started = 0;
    let release!: () => void;
    const allStarted = new Promise<void>((resolve) => {
      release = resolve;
    });

    const types: FeatureBlockType[] = [
      "content.hero",
      "content.about",
      "content.faq",
    ];
    const registry = createFeatureBlockRegistry(
      types.map(
        (type) =>
          ({
            type,
            schemaVersions: [1],
            capability: null,
            parseConfig: (raw: unknown) => ({ ok: true, value: raw as never }),
            load: async () => {
              started += 1;
              if (started === EXPECTED) release();
              await allStarted;
              return {} as never;
            },
          }) as unknown as FeatureBlockDefinition<FeatureBlockType>,
      ),
    );

    const document: ThemeDocument = {
      version: 1,
      layoutDefinitionId: "marysoll-landing-v1",
      brand: { colors: {}, typography: {} },
      lifecycle: "published",
      sections: types.map((type, i) => ({
        id: `s${i}`,
        sectionType: "content",
        blocks: [
          { id: `b${i}`, type, schemaVersion: 1, slot: "main", config: {} },
        ],
      })),
    };

    const data = await resolveBlockData({
      document,
      theme: "theme-1",
      deps: depsFor(tenants[0][1]),
      registry,
    });

    expect(Object.keys(data)).toHaveLength(EXPECTED);
  }, 2000);
});

describe("nijedan problem sa blokom ne obara stranu (spec 5.1)", () => {
  const [, ls] = tenants[0];

  function documentWith(block: Record<string, unknown>): ThemeDocument {
    return {
      version: 1,
      layoutDefinitionId: "marysoll-landing-v1",
      brand: { colors: {}, typography: {} },
      lifecycle: "published",
      sections: [
        {
          id: "x",
          sectionType: "content",
          blocks: [block as never],
        },
      ],
    };
  }

  it("nepoznat tip → skip + telemetrija", async () => {
    const telemetry = vi.fn();
    const data = await resolveBlockData({
      document: documentWith({
        id: "edu",
        type: "education.course",
        schemaVersion: 1,
        slot: "main",
        config: {},
      }),
      theme: "theme-1",
      deps: depsFor(ls),
      telemetry,
    });

    expect(data).toEqual({});
    expect(telemetry).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "unknown_block_type", type: "education.course" }),
    );
  });

  it("nepodržan schemaVersion → skip + telemetrija", async () => {
    const telemetry = vi.fn();
    const data = await resolveBlockData({
      document: documentWith({
        id: "hero-block",
        type: "content.hero",
        schemaVersion: 7,
        slot: "main",
        config: { source: "hero" },
      }),
      theme: "theme-1",
      deps: depsFor(ls),
      telemetry,
    });

    expect(data).toEqual({});
    expect(telemetry).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "unsupported_schema_version" }),
    );
  });

  it("neispravan config → skip + telemetrija", async () => {
    const telemetry = vi.fn();
    const data = await resolveBlockData({
      document: documentWith({
        id: "gallery-block",
        type: "content.gallery",
        schemaVersion: 1,
        slot: "main",
        config: { source: "gallery" }, // nedostaje galleryVariant
      }),
      theme: "theme-1",
      deps: depsFor(ls),
      telemetry,
    });

    expect(data).toEqual({});
    expect(telemetry).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "invalid_config" }),
    );
  });

  it("pukao loader ne ruši ostale blokove", async () => {
    const telemetry = vi.fn();
    const registry = createFeatureBlockRegistry([
      {
        type: "content.hero",
        schemaVersions: [1],
        capability: null,
        parseConfig: () => ({ ok: true, value: { source: "hero" } }),
        load: async () => {
          throw new Error("baza nedostupna");
        },
      } as unknown as FeatureBlockDefinition<FeatureBlockType>,
      {
        type: "content.about",
        schemaVersions: [1],
        capability: null,
        parseConfig: () => ({ ok: true, value: { source: "about" } }),
        load: async () => ({ content: undefined }),
      } as unknown as FeatureBlockDefinition<FeatureBlockType>,
    ]);

    const document: ThemeDocument = {
      version: 1,
      layoutDefinitionId: "marysoll-landing-v1",
      brand: { colors: {}, typography: {} },
      lifecycle: "published",
      sections: [
        {
          id: "hero",
          sectionType: "content",
          blocks: [
            { id: "hero-block", type: "content.hero", schemaVersion: 1, slot: "main", config: {} },
          ],
        },
        {
          id: "about",
          sectionType: "content",
          blocks: [
            { id: "about-block", type: "content.about", schemaVersion: 1, slot: "main", config: {} },
          ],
        },
      ],
    };

    const data = await resolveBlockData({
      document,
      theme: "theme-1",
      deps: depsFor(ls),
      registry,
      telemetry,
    });

    expect(Object.keys(data)).toEqual(["about-block"]);
    expect(telemetry).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "loader_failed", detail: "baza nedostupna" }),
    );
  });
});
