/**
 * Theme6 migracija — regresija PROPOVA nad stvarnim tenantima.
 *
 * Referentna istina je doslovna kopija JSX izraza iz `Theme6Landing` pre
 * migracije (commit 149387b).
 *
 * theme-6 komponente imaju bogate podrazumevane vrednosti, pa je najveći rizik
 * proslediti prazan string/niz umesto `undefined` — tada bi default nestao.
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
  resolveBlockData,
} from "@/lib/platform/blocks";
import type {
  ContentAboutData,
  ContentGalleryData,
  ContentHeroData,
  ContentTeamData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import {
  theme6AboutProps,
  theme6GalleryProps,
  theme6HeroProps,
  theme6ServicesCatalogProps,
  theme6TeamProps,
  theme6TestimonialsProps,
} from "./blockProps";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);

const TENANT_SLUG = "demo-6";
const SERVICES = [{ _id: "s1", name: "Manikir" }] as unknown as IService[];
const TESTIMONIALS: PublicTestimonial[] = [
  { _id: "t1", clientName: "Ana", rating: 5, comment: "Preporuka" },
];
const STATS: TenantStats = {
  clientCount: 64,
  appointmentCount: 200,
  completedAppointmentCount: 180,
  averageRating: 4.7,
  reviewCount: 9,
};

function resolveHref(href: string) {
  if (!href) return "#";
  if (/^https?:\/\//.test(href)) return href;
  return href.startsWith("/") ? `/${TENANT_SLUG}${href}` : `/${TENANT_SLUG}/${href}`;
}

function salonFor(ls: LandingStructure): SalonProfileData {
  return {
    _id: "salon-6",
    name: "Demo 6",
    email: "salon@example.com",
    description: "Studio za nokte",
    phone: "060/555-666",
    street: "Ulica 6",
    city: "Niš",
    social: { instagram: "demo6_ig" },
    landingStructure: ls,
  } as unknown as SalonProfileData;
}

/** Doslovna kopija propova iz starog `Theme6Landing`. */
function legacyProps(
  ls: LandingStructure,
  salon: SalonProfileData,
  tenantStats: TenantStats | undefined,
  testimonials: PublicTestimonial[],
) {
  const heroCtas = ls?.landing?.hero?.ctas;
  const primary = {
    text: heroCtas?.primary?.text || "",
    href: resolveHref(heroCtas?.primary?.href || "/termini"),
  };
  return {
    hero: {
      salonName: salon.name,
      salonDescription: salon.description,
      headline: ls?.landing?.hero?.headline,
      subheadline: ls?.landing?.hero?.subheadline,
      imageUrl: ls?.landing?.hero?.image?.src,
      cta: { label: primary.text || "Zakaži", href: primary.href },
    },
    about: {
      headline: ls?.landing?.about?.headline,
      paragraphs: Array.isArray(ls?.landing?.about?.paragraphs)
        ? ls.landing.about.paragraphs
        : undefined,
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
        : undefined,
    },
    services: {
      services: SERVICES,
      headline: ls?.landing?.servicesPreview?.headline,
      subheadline: ls?.landing?.servicesPreview?.subheadline,
      tenantSlug: TENANT_SLUG,
    },
    testimonials: {
      testimonials: testimonials.map((t) => ({
        name: t.clientName,
        text: t.comment,
      })),
    },
    team: {
      headline: ls?.landing?.artists?.headline,
      members: ls?.landing?.artists?.members?.map((m) => ({
        name: m.name,
        role: m.role,
        image: m.image?.src,
      })),
    },
    gallery: {
      headline: ls?.landing?.gallery?.headline,
      subheadline: ls?.landing?.gallery?.subheadline,
      images: (ls?.landing?.gallery?.images ?? []).map((img) => ({
        src: img.src,
        title: img.alt,
      })),
    },
  };
}

async function blockDataFor(
  ls: LandingStructure,
  opts: { tenantStats?: TenantStats; testimonials?: PublicTestimonial[] } = {},
) {
  const tenantStats = "tenantStats" in opts ? opts.tenantStats : STATS;
  const salon = salonFor(ls);
  const document = landingStructureToThemeDocument(ls, { theme: "theme-6" });
  const data = await resolveBlockData({
    document,
    theme: "theme-6",
    tenantSlug: TENANT_SLUG,
    deps: preloadedBlockDataSource({
      salon,
      services: SERVICES,
      testimonials: opts.testimonials ?? TESTIMONIALS,
      tenantStats,
    }),
  });
  return { salon, data };
}

describe.each(tenants)("%s — propovi su identični starom putu", (slug, ls) => {
  it("hero", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("hero")];
    expect(block, slug).toBeDefined();
    expect(theme6HeroProps(block!.data as ContentHeroData, resolveHref)).toEqual(
      legacyProps(ls, salon, STATS, TESTIMONIALS).hero,
    );
  });

  it("about", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme6AboutProps(data[sectionBlockId("about")]!.data as ContentAboutData),
    ).toEqual(legacyProps(ls, salon, STATS, TESTIMONIALS).about);
  });

  it("servicesPreview", async () => {
    const { salon, data } = await blockDataFor(ls);
    expect(
      theme6ServicesCatalogProps(
        data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
        TENANT_SLUG,
      ),
    ).toEqual(legacyProps(ls, salon, STATS, TESTIMONIALS).services);
  });

  it("gallery (portfolio oblik: src + title)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const props = theme6GalleryProps(
      data[sectionBlockId("gallery")]!.data as ContentGalleryData,
    );
    const legacy = legacyProps(ls, salon, STATS, TESTIMONIALS).gallery;
    if (legacy.images.length === 0) {
      expect(props).toBeNull();
      return;
    }
    expect(props).toEqual(legacy);
  });

  it("artists/team (kad je sekcija uključena)", async () => {
    const { salon, data } = await blockDataFor(ls);
    const block = data[sectionBlockId("artists")];
    if (!block) {
      expect(ls.landing.artists.enabled).toBe(false);
      return;
    }
    expect(theme6TeamProps(block.data as ContentTeamData)).toEqual(
      legacyProps(ls, salon, STATS, TESTIMONIALS).team,
    );
  });
});

describe("prazna stanja (zatečeno ponašanje)", () => {
  const [, base] = tenants[0];

  it("bez usluga se sekcija ne prikazuje", async () => {
    const document = landingStructureToThemeDocument(base, { theme: "theme-6" });
    const data = await resolveBlockData({
      document,
      theme: "theme-6",
      deps: preloadedBlockDataSource({
        salon: salonFor(base),
        services: [],
        testimonials: TESTIMONIALS,
        tenantStats: STATS,
      }),
    });
    expect(
      theme6ServicesCatalogProps(
        data[sectionBlockId("servicesPreview")]!.data as ServicesCatalogData,
        TENANT_SLUG,
      ),
    ).toBeNull();
  });

  it("bez utisaka se sekcija ne prikazuje", async () => {
    // Namerno tenant kome je sekcija UKLJUČENA — inače bloka nema, pa bi test
    // izašao ranije i ništa ne bi proverio.
    const [, withTestimonials] = tenants.find(
      ([s]) => s === "marysoll-makeup-nails",
    )!;
    expect(withTestimonials.landing.testimonials.enabled).toBe(true);

    const { data } = await blockDataFor(withTestimonials, { testimonials: [] });
    const block = data[sectionBlockId("testimonials")];
    expect(block).toBeDefined();
    expect(
      theme6TestimonialsProps(block!.data as ContentTestimonialsData),
    ).toBeNull();
  });

  it("sa utiscima se mapira u { name, text }", async () => {
    const [, withTestimonials] = tenants.find(
      ([s]) => s === "marysoll-makeup-nails",
    )!;
    const { data } = await blockDataFor(withTestimonials);
    const props = theme6TestimonialsProps(
      data[sectionBlockId("testimonials")]!.data as ContentTestimonialsData,
    );
    expect(props).toEqual({
      testimonials: [{ name: "Ana", text: "Preporuka" }],
    });
  });

  it("bez slika galerije se sekcija ne prikazuje", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: { ...base.landing, gallery: { ...base.landing.gallery, images: [] } },
    };
    const { data } = await blockDataFor(ls);
    expect(
      theme6GalleryProps(
        data[sectionBlockId("gallery")]!.data as ContentGalleryData,
      ),
    ).toBeNull();
  });

  it("about bez metrika → stats undefined (komponenta pokazuje svoj default)", async () => {
    const { data } = await blockDataFor(base, { tenantStats: undefined });
    expect(
      theme6AboutProps(data[sectionBlockId("about")]!.data as ContentAboutData)
        .stats,
    ).toBeUndefined();
  });
});

describe("polja koja fixture ne pokriva", () => {
  const [, base] = tenants[0];

  /**
   * Nijedan produkcioni tenant nema slike u galeriji, pa bi bez ovog testa
   * pogrešno mapiranje (`title` ← `src` umesto `alt`) prošlo neprimećeno.
   */
  it("slike galerije se mapiraju u { src, title: alt }", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        gallery: {
          ...base.landing.gallery,
          images: [
            { src: "https://cdn.example.com/1.png", alt: "Francuski nokti" },
            { src: "https://cdn.example.com/2.png", alt: "Ombre" },
          ],
        },
      },
    };
    const { data } = await blockDataFor(ls);
    const props = theme6GalleryProps(
      data[sectionBlockId("gallery")]!.data as ContentGalleryData,
    );
    expect(props!.images).toEqual([
      { src: "https://cdn.example.com/1.png", title: "Francuski nokti" },
      { src: "https://cdn.example.com/2.png", title: "Ombre" },
    ]);
  });

  /**
   * `paragraphs` je u svim fixture-ima niz; stari kod je imao `Array.isArray`
   * proveru, pa se bez ovog testa gubitak te provere ne bi video.
   */
  it("paragraphs koji nije niz → undefined (komponenta pokazuje default)", async () => {
    const ls: LandingStructure = {
      ...base,
      landing: {
        ...base.landing,
        about: {
          ...base.landing.about,
          paragraphs: "jedan pasus kao string" as never,
        },
      },
    };
    const { data } = await blockDataFor(ls);
    expect(
      theme6AboutProps(data[sectionBlockId("about")]!.data as ContentAboutData)
        .paragraphs,
    ).toBeUndefined();
  });
});

describe("theme-6 nema compat putanju", () => {
  it("skup blokova je tačno onaj iz dokumenta", async () => {
    for (const [slug, ls] of tenants) {
      const { data } = await blockDataFor(ls);
      const document = landingStructureToThemeDocument(ls, { theme: "theme-6" });
      expect(Object.keys(data).sort(), slug).toEqual(
        document.sections.flatMap((x) => x.blocks.map((b) => b.id)).sort(),
      );
    }
  });
});
