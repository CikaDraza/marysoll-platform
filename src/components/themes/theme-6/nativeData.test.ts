/**
 * theme-6 native view model — vidljivost Instagram trake bez CMS flaga u temi.
 *
 * Ranije je tema primala `galleryEnabled` i sama čitala `landingStructure`.
 * Sada aplikacijski sloj izračuna šta traka prikazuje, pa je odluka testabilna
 * bez renderovanja.
 */
import { describe, expect, it } from "vitest";
import type { LandingStructure, SalonProfileData } from "@/types";
import { makeResolveHref } from "@/helpers/tenantHref";
import fixtures from "@/lib/platform/__fixtures__/landing-structures.json";
import { buildTheme6Native } from "./nativeData";

const tenants = Object.entries(
  fixtures as unknown as Record<string, LandingStructure>,
);
const [, BASE] = tenants[0];

function withGallery(patch: Partial<LandingStructure["landing"]["gallery"]>) {
  return {
    ...BASE,
    landing: { ...BASE.landing, gallery: { ...BASE.landing.gallery, ...patch } },
  } as LandingStructure;
}

/** Salon sa zadatim CMS-om — builder sada prima ceo profil, ne samo strukturu. */
function salonWith(
  landingStructure: LandingStructure | undefined,
  instagram = "salon_ig",
): SalonProfileData {
  return {
    _id: "s6",
    name: "Demo 6",
    email: "demo@example.com",
    description: "",
    phone: "060/000",
    street: "",
    city: "",
    social: { instagram },
    landingStructure,
  } as unknown as SalonProfileData;
}

const build = (
  landingStructure: LandingStructure | undefined,
  instagram = "salon_ig",
) =>
  buildTheme6Native({
    salon: salonWith(landingStructure, instagram),
    tenantSlug: "demo-6",
    resolveHref: makeResolveHref("demo-6"),
  });

describe("vidljivost trake", () => {
  it("prati galleryEnabled iz CMS-a", () => {
    expect(
      build(withGallery({ enabled: true }), "ig").instagramStrip.visible,
    ).toBe(true);

    expect(
      build(withGallery({ enabled: false }), "ig").instagramStrip.visible,
    ).toBe(false);
  });

  it("bez CMS podataka je vidljiva (isti default kao stari flag)", () => {
    expect(
      build(undefined, "ig")
        .instagramStrip.visible,
    ).toBe(true);
  });
});

describe("sadržaj trake", () => {
  it("instagram link iz CMS-a ima prednost nad salonskim", () => {
    const native = build(
      withGallery({
        instagram: { link: "https://ig.example/cms", username: "@cms" },
      }),
    );
    expect(native.instagramStrip.instagramUrl).toBe("https://ig.example/cms");
    expect(native.instagramStrip.instagramTag).toBe("@cms");
  });

  it("bez CMS linka pada na salonski instagram", () => {
    const native = build(withGallery({ instagram: { username: "@x" } }), "salon_ig");
    expect(native.instagramStrip.instagramUrl).toBe("salon_ig");
  });

  it("uzima najviše 6 slika", () => {
    const images = Array.from({ length: 9 }, (_, i) => ({
      src: `img-${i}.png`,
      alt: `slika ${i}`,
    }));
    const native = build(withGallery({ images }), "ig");
    expect(native.instagramStrip.images).toHaveLength(6);
    expect(native.instagramStrip.images![0]).toEqual({ src: "img-0.png" });
  });

  it("bez slika vraća undefined, ne prazan niz (komponenta ima svoj default)", () => {
    const native = build(withGallery({ images: [] }), "ig");
    expect(native.instagramStrip.images).toBeUndefined();
  });

  it("naslov cenovnika stiže iz CMS-a, tema ne čita landingStructure", () => {
    const ls: LandingStructure = {
      ...BASE,
      landing: {
        ...BASE.landing,
        servicesPreview: { ...BASE.landing.servicesPreview, headline: "Naš cenovnik" },
      },
    };
    expect(
      build(ls, "ig")
        .pricingHeadline,
    ).toBe("Naš cenovnik");
  });
});
