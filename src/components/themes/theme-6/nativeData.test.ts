/**
 * theme-6 native view model — vidljivost Instagram trake bez CMS flaga u temi.
 *
 * Ranije je tema primala `galleryEnabled` i sama čitala `landingStructure`.
 * Sada aplikacijski sloj izračuna šta traka prikazuje, pa je odluka testabilna
 * bez renderovanja.
 */
import { describe, expect, it } from "vitest";
import type { LandingStructure } from "@/types";
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

describe("vidljivost trake", () => {
  it("prati galleryEnabled iz CMS-a", () => {
    expect(
      buildTheme6Native({
        landingStructure: withGallery({ enabled: true }),
        salonInstagram: "ig",
      }).instagramStrip.visible,
    ).toBe(true);

    expect(
      buildTheme6Native({
        landingStructure: withGallery({ enabled: false }),
        salonInstagram: "ig",
      }).instagramStrip.visible,
    ).toBe(false);
  });

  it("bez CMS podataka je vidljiva (isti default kao stari flag)", () => {
    expect(
      buildTheme6Native({ landingStructure: undefined, salonInstagram: "ig" })
        .instagramStrip.visible,
    ).toBe(true);
  });
});

describe("sadržaj trake", () => {
  it("instagram link iz CMS-a ima prednost nad salonskim", () => {
    const native = buildTheme6Native({
      landingStructure: withGallery({
        instagram: { link: "https://ig.example/cms", username: "@cms" },
      }),
      salonInstagram: "salon_ig",
    });
    expect(native.instagramStrip.instagramUrl).toBe("https://ig.example/cms");
    expect(native.instagramStrip.instagramTag).toBe("@cms");
  });

  it("bez CMS linka pada na salonski instagram", () => {
    const native = buildTheme6Native({
      landingStructure: withGallery({ instagram: { username: "@x" } }),
      salonInstagram: "salon_ig",
    });
    expect(native.instagramStrip.instagramUrl).toBe("salon_ig");
  });

  it("uzima najviše 6 slika", () => {
    const images = Array.from({ length: 9 }, (_, i) => ({
      src: `img-${i}.png`,
      alt: `slika ${i}`,
    }));
    const native = buildTheme6Native({
      landingStructure: withGallery({ images }),
      salonInstagram: "ig",
    });
    expect(native.instagramStrip.images).toHaveLength(6);
    expect(native.instagramStrip.images![0]).toEqual({ src: "img-0.png" });
  });

  it("bez slika vraća undefined, ne prazan niz (komponenta ima svoj default)", () => {
    const native = buildTheme6Native({
      landingStructure: withGallery({ images: [] }),
      salonInstagram: "ig",
    });
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
      buildTheme6Native({ landingStructure: ls, salonInstagram: "ig" })
        .pricingHeadline,
    ).toBe("Naš cenovnik");
  });
});
