import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentImageRefSchema } from "@/lib/content/schemas/landing-blocks";
import { validateContentBlock } from "@/lib/content/validation/contentBlockValidation";
import { focalObjectPosition } from "@/components/content-composer/blocks/ContentImage";
import {
  HERO_MAX_IMAGES,
  blockImageAspectHint,
  heroImageAspectHint,
} from "./imageFraming";

describe("preporuka kadra", () => {
  it("hero preporuka postoji za svaki slot koji se stvarno renderuje", () => {
    for (let count = 1; count <= HERO_MAX_IMAGES; count += 1) {
      for (let index = 0; index < count; index += 1) {
        expect(heroImageAspectHint(count, index)).toBeTruthy();
      }
    }
  });

  it("jedna slika se na telefonu i na desktopu seče različito", () => {
    // Zbog toga focal point uopšte postoji.
    expect(heroImageAspectHint(1, 0)).toMatch(/telefonu/);
    expect(heroImageAspectHint(1, 0)).toMatch(/desktopu/);
  });

  it("nema preporuke za slot koji tema ne prikazuje", () => {
    expect(heroImageAspectHint(1, 1)).toBeUndefined();
    expect(heroImageAspectHint(4, 4)).toBeUndefined();
  });

  it("preporuka prati broj slotova u stvarnom rendereru", () => {
    // Ako neko doda peti hero raspored, ovaj test pada zajedno sa njim.
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src/components/content-composer/blocks/HeroBlock.tsx",
      ),
      "utf8",
    );
    const layouts = source.slice(
      source.indexOf("const galleryLayouts"),
      source.indexOf("export default function HeroBlock"),
    );

    for (let count = 1; count <= HERO_MAX_IMAGES; count += 1) {
      expect(layouts).toContain(`  ${count}: {`);
    }
    expect(layouts).not.toContain(`  ${HERO_MAX_IMAGES + 1}: {`);
  });

  it("blokovi sa stalnim kadrom imaju svoju preporuku", () => {
    expect(blockImageAspectHint("ArticleBlock")).toBe("16:9");
    expect(blockImageAspectHint("ImageGalleryBlock")).toBe("4:3");
    expect(blockImageAspectHint("CalloutBlock")).toBeUndefined();
  });
});

describe("fokus kadra", () => {
  it("bez fokusa ostaje podrazumevani centar", () => {
    expect(focalObjectPosition(undefined)).toBeUndefined();
  });

  it("fokus se prevodi u object-position", () => {
    expect(focalObjectPosition({ x: 0.5, y: 0.5 })).toBe("50% 50%");
    expect(focalObjectPosition({ x: 0, y: 1 })).toBe("0% 100%");
    expect(focalObjectPosition({ x: 0.256, y: 0.744 })).toBe("26% 74%");
  });

  it("shema prihvata fokus i odbija vrednosti van slike", () => {
    const image = { src: "https://cdn.example.com/a.jpg", alt: "A" };

    expect(
      contentImageRefSchema.safeParse({ ...image, focalPoint: { x: 0.2, y: 0.8 } })
        .success,
    ).toBe(true);
    expect(
      contentImageRefSchema.safeParse({ ...image, focalPoint: { x: 1.4, y: 0 } })
        .success,
    ).toBe(false);
  });

  it("blok sa fokusom ostaje validan i u draft i u publish režimu", () => {
    const block = {
      id: "a",
      type: "ArticleBlock",
      priority: 1,
      title: "Estetika lica",
      paragraphs: ["Tekst."],
      image: {
        src: "https://cdn.example.com/a.jpg",
        alt: "A",
        focalPoint: { x: 0.3, y: 0.2 },
      },
    };

    const validation = validateContentBlock(block);
    expect(validation.status).toBe("VALID");
    // Fokus mora preživeti validaciju — inače bi se tiho gubio pri objavi.
    expect(validation.block).toMatchObject({
      image: { focalPoint: { x: 0.3, y: 0.2 } },
    });
  });
});
