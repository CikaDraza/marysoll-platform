import { describe, expect, it } from "vitest";
import type {
  ContentBlock,
  LandingBlockType,
} from "@/lib/content/schemas/landing-blocks";
import { createDraftContentBlock } from "@/lib/content/editor/blockFactories";
import {
  validateContentBlock,
  validateContentDocument,
} from "./contentBlockValidation";

const completeBlocks: Record<LandingBlockType, ContentBlock> = {
  HeroBlock: {
    id: "hero",
    type: "HeroBlock",
    priority: 1,
    title: "Naslov",
  },
  ArticleBlock: {
    id: "article",
    type: "ArticleBlock",
    priority: 1,
    title: "Naslov",
    paragraphs: ["Tekst"],
  },
  FeatureBlock: {
    id: "feature",
    type: "FeatureBlock",
    priority: 1,
    title: "Naslov",
    sections: [{ title: "Sekcija", paragraphs: ["Tekst"] }],
  },
  ContentSplitBlock: {
    id: "split",
    type: "ContentSplitBlock",
    priority: 1,
    title: "Naslov",
    content: "Tekst",
  },
  PricingBlock: {
    id: "pricing",
    type: "PricingBlock",
    priority: 1,
    title: "Cenovnik",
    items: [{ title: "Paket" }],
  },
  AffiliateCTABlock: {
    id: "cta",
    type: "AffiliateCTABlock",
    priority: 1,
    title: "Poziv",
    ctaLabel: "Saznaj više",
    href: "/kontakt",
  },
};

describe.each(Object.keys(completeBlocks) as LandingBlockType[])(
  "%s validation",
  (type) => {
    it("complete blok je VALID", () => {
      expect(validateContentBlock(completeBlocks[type]).status).toBe("VALID");
    });

    it("draft sa praznim required sadržajem je INCOMPLETE", () => {
      const draft = createDraftContentBlock(type, 1, () => `${type}-draft`);
      const result = validateContentBlock(draft);

      expect(result.status).toBe("INCOMPLETE");
      expect(result.issues.every(({ code }) => code === "required_content")).toBe(
        true,
      );
    });

    it("pokvarena struktura je INVALID", () => {
      const malformed = { ...completeBlocks[type], priority: "first" };
      const result = validateContentBlock(malformed);

      expect(result.status).toBe("INVALID");
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            blockType: type,
            path: "priority",
            code: "invalid_structure",
            severity: "error",
          }),
        ]),
      );
    });

    it("hidden nepotpun blok je HIDDEN i ne blokira publish", () => {
      const draft = {
        ...createDraftContentBlock(type, 1, () => `${type}-hidden`),
        visibility: "hidden" as const,
      };

      expect(validateContentBlock(draft).status).toBe("HIDDEN");
      expect(validateContentDocument([draft], "publish").valid).toBe(true);
    });
  },
);

describe("document validation modes", () => {
  it("draft prihvata incomplete, publish ga odbija", () => {
    const draft = createDraftContentBlock("ArticleBlock", 1, () => "draft");

    expect(validateContentDocument([draft], "draft").valid).toBe(true);
    expect(validateContentDocument([draft], "publish").valid).toBe(false);
  });

  it("nepoznat tip je INVALID i u draft i u publish režimu", () => {
    const unknown = { id: "x", type: "UnknownBlock", priority: 1 };

    expect(validateContentDocument([unknown], "draft").valid).toBe(false);
    expect(validateContentDocument([unknown], "publish").valid).toBe(false);
  });
});
