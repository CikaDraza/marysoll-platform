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
  VideoBlock: {
    id: "video", type: "VideoBlock", priority: 1,
    source: { provider: "youtube", url: "https://www.youtube.com/watch?v=abc123" },
  },
  TableBlock: {
    id: "table", type: "TableBlock", priority: 1,
    columns: [{ id: "name", label: "Naziv" }],
    rows: [{ id: "row", cells: { name: "Vrednost" } }],
  },
  CalloutBlock: {
    id: "callout", type: "CalloutBlock", priority: 1, variant: "important", content: "Važno",
  },
  ChecklistBlock: {
    id: "checklist", type: "ChecklistBlock", priority: 1,
    items: [{ id: "step", text: "Korak" }],
  },
  FileDownloadBlock: {
    id: "file", type: "FileDownloadBlock", priority: 1, title: "Materijal",
    file: { src: "https://cdn.example.com/material.pdf", fileName: "material.pdf" },
  },
  ImageGalleryBlock: {
    id: "gallery", type: "ImageGalleryBlock", priority: 1,
    images: [{ id: "image", src: "https://cdn.example.com/image.jpg", alt: "Opis" }],
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

      expect(draft).toMatchObject({ id: `${type}-draft`, type, priority: 1 });
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

  it.each(["blob:https://app.test/local", "data:image/png;base64,abc"])(
    "draft persistence odbija transient media source %s",
    (src) => {
      const block = {
        id: "unsafe-image",
        type: "ImageGalleryBlock",
        priority: 1,
        images: [{ id: "image", src, alt: "Opis" }],
      };

      expect(validateContentBlock(block).status).toBe("INVALID");
      expect(validateContentDocument([block], "draft").valid).toBe(false);
    },
  );

  it.each(["/uploads/material.pdf", "https://cdn.example.com/material.pdf"])(
    "draft persistence prihvata trajni media source %s",
    (src) => {
      const block = {
        id: "file",
        type: "FileDownloadBlock",
        priority: 1,
        title: "Materijal",
        file: { src },
      };

      expect(validateContentBlock(block).status).toBe("VALID");
      expect(validateContentDocument([block], "draft").valid).toBe(true);
    },
  );

  it("nedostajući media ostaje INCOMPLETE, a malformed provider ref je INVALID", () => {
    const missing = createDraftContentBlock("VideoBlock", 1, () => "missing");
    const malformed = {
      id: "bad-video",
      type: "VideoBlock",
      priority: 1,
      source: { provider: "upload", url: "https://cdn.example.com/video.mp4" },
    };

    expect(validateContentBlock(missing).status).toBe("INCOMPLETE");
    expect(validateContentBlock(malformed).status).toBe("INVALID");
  });

  it("non-array HTTP layout je dokument-level INVALID umesto exception-a", () => {
    const result = validateContentDocument({ blocks: [] }, "draft");

    expect(result.valid).toBe(false);
    expect(result.blocks[0]).toMatchObject({
      blockType: "document",
      status: "INVALID",
    });
  });

  it("hidden oznaka ne može da prikrije structurally malformed blok", () => {
    const malformed = {
      id: "hidden-bad",
      type: "CalloutBlock",
      priority: "first",
      visibility: "hidden",
      variant: "info",
      content: "",
    };
    const result = validateContentBlock(malformed);

    expect(result.status).toBe("INVALID");
    expect(validateContentDocument([malformed], "publish").valid).toBe(false);
  });
});

describe("hidden structural invariants", () => {
  it.each([
    {
      label: "Table duplicate column ids",
      block: {
        id: "table-columns",
        type: "TableBlock",
        priority: 1,
        visibility: "hidden",
        columns: [{ id: "same", label: "A" }, { id: "same", label: "B" }],
        rows: [{ id: "row", cells: { same: "Vrednost" } }],
      },
    },
    {
      label: "Table duplicate row ids",
      block: {
        id: "table-rows",
        type: "TableBlock",
        priority: 1,
        visibility: "hidden",
        columns: [{ id: "column", label: "A" }],
        rows: [
          { id: "same", cells: { column: "Prvi" } },
          { id: "same", cells: { column: "Drugi" } },
        ],
      },
    },
    {
      label: "Table cell and column mismatch",
      block: {
        id: "table-cells",
        type: "TableBlock",
        priority: 1,
        visibility: "hidden",
        columns: [{ id: "expected", label: "A" }],
        rows: [{ id: "row", cells: { wrong: "Vrednost" } }],
      },
    },
    {
      label: "Checklist duplicate item ids",
      block: {
        id: "checklist",
        type: "ChecklistBlock",
        priority: 1,
        visibility: "hidden",
        items: [{ id: "same", text: "A" }, { id: "same", text: "B" }],
      },
    },
    {
      label: "Gallery duplicate image ids",
      block: {
        id: "gallery",
        type: "ImageGalleryBlock",
        priority: 1,
        visibility: "hidden",
        images: [
          { id: "same", src: "/a.jpg", alt: "A" },
          { id: "same", src: "/b.jpg", alt: "B" },
        ],
      },
    },
    {
      label: "Video provider and URL mismatch",
      block: {
        id: "video",
        type: "VideoBlock",
        priority: 1,
        visibility: "hidden",
        source: { provider: "youtube", url: "https://vimeo.com/12345" },
      },
    },
  ])("$label je INVALID i ne prolazi publish", ({ block }) => {
    expect(validateContentBlock(block).status).toBe("INVALID");
    expect(validateContentDocument([block], "publish").valid).toBe(false);
  });

  it("hidden incomplete content ostaje HIDDEN i prolazi publish", () => {
    const block = {
      id: "callout",
      type: "CalloutBlock",
      priority: 1,
      visibility: "hidden",
      variant: "info",
      content: "",
    };

    expect(validateContentBlock(block).status).toBe("HIDDEN");
    expect(validateContentDocument([block], "publish").valid).toBe(true);
  });
});
