import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import { contentAssetRefSchema, landingBlockSchema, landingBlockTypes } from "@/lib/content/schemas/landing-blocks";
import { blockRegistry } from "@/lib/content/registry/blockRegistry";
import { sanitizeLayout } from "@/lib/content/blocks/sanitizeLayout";
import { extractTextFromBlocks } from "@/lib/content/blocks/extractTextFromBlocks";
import { moveMediaItem, uploadContentMedia } from "@/lib/content/media/authoring";
import { resolveVideoSource } from "@/lib/content/media/videoSource";

const newBlocks: ContentBlock[] = [
  { id: "video", type: "VideoBlock", priority: 6, title: "Vežba", caption: "Pogledajte", source: { provider: "youtube", url: "https://youtu.be/abc123" } },
  { id: "table", type: "TableBlock", priority: 5, title: "Poređenje", caption: "Rezultati", columns: [{ id: "a", label: "Tretman" }], rows: [{ id: "r", cells: { a: "Nega" } }] },
  { id: "callout", type: "CalloutBlock", priority: 4, variant: "warning", title: "Pažnja", content: "Prekinite ako peče." },
  { id: "checklist", type: "ChecklistBlock", priority: 3, title: "Koraci", items: [{ id: "i", text: "Očistite kožu" }] },
  { id: "file", type: "FileDownloadBlock", priority: 2, title: "Vodič", description: "PDF materijal", file: { src: "https://cdn.example.com/vodic.pdf", fileName: "vodic.pdf" } },
  { id: "gallery", type: "ImageGalleryBlock", priority: 1, title: "Primeri", images: [{ id: "img", src: "https://cdn.example.com/slika.jpg", alt: "Rezultat", caption: "Posle tretmana" }] },
];

describe("F2B six-block shared contract", () => {
  it("registry and type authority contain exactly all 12 blocks", () => {
    expect(landingBlockTypes).toHaveLength(12);
    expect(Object.keys(blockRegistry).sort()).toEqual([...landingBlockTypes].sort());
  });

  it("sanitizer keeps all six valid blocks and normalizes their priorities", () => {
    const result = sanitizeLayout(newBlocks);
    expect(result.map(({ type }) => type)).toEqual([
      "ImageGalleryBlock", "FileDownloadBlock", "ChecklistBlock", "CalloutBlock", "TableBlock", "VideoBlock",
    ]);
    expect(result.map(({ priority }) => priority)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("extracts expected searchable text from all six blocks", () => {
    const text = extractTextFromBlocks(newBlocks);
    expect(text).toContain("Vežba\nPogledajte");
    expect(text).toContain("Poređenje\nTretman\nNega\nRezultati");
    expect(text).toContain("Pažnja\nPrekinite ako peče.");
    expect(text).toContain("Koraci\nOčistite kožu");
    expect(text).toContain("Vodič\nPDF materijal\nvodic.pdf");
    expect(text).toContain("Primeri\nRezultat\nPosle tretmana");
  });

  it("rejects inconsistent tables, provider mismatch, duplicate ids and temporary URLs", () => {
    expect(landingBlockSchema.safeParse({ ...newBlocks[1], rows: [{ id: "r", cells: {} }] }).success).toBe(false);
    expect(landingBlockSchema.safeParse({ ...newBlocks[0], source: { provider: "vimeo", url: "https://youtube.com/watch?v=x" } }).success).toBe(false);
    expect(landingBlockSchema.safeParse({ ...newBlocks[3], items: [{ id: "same", text: "A" }, { id: "same", text: "B" }] }).success).toBe(false);
    expect(landingBlockSchema.safeParse({ ...newBlocks[4], file: { src: "blob:temporary" } }).success).toBe(false);
  });

  it("keeps legacy {src, alt} images valid", () => {
    expect(landingBlockSchema.safeParse({ id: "old", type: "ArticleBlock", priority: 1, title: "Staro", paragraphs: ["Radi"], image: { src: "https://cdn.example.com/old.jpg", alt: "Stara slika" } }).success).toBe(true);
  });

  it("neutral renderers contain semantic and degradation affordances", async () => {
    const sources = await Promise.all(["VideoBlock", "TableBlock", "CalloutBlock", "ChecklistBlock", "FileDownloadBlock", "ImageGalleryBlock"].map((name) => readFile(`src/components/content-composer/blocks/${name}.tsx`, "utf8")));
    expect(sources[0]).toMatch(/<iframe|<video/);
    expect(sources[0]).toContain("Video trenutno nije dostupan");
    expect(sources[1]).toContain("overflow-x-auto");
    expect(sources[1]).toContain("<table");
    expect(sources[2]).toContain("aria-label");
    expect(sources[3]).toContain("<ul");
    expect(sources[4]).toContain("Fajl trenutno nije dostupan");
    expect(sources[5]).toContain("image.caption");
    const safeImage = await readFile("src/components/content-composer/blocks/ContentImage.tsx", "utf8");
    expect(safeImage).toContain("onError");
    expect(safeImage).toContain("Slika trenutno nije dostupna");
  });
});

describe("shared media authoring boundary", () => {
  const file = { name: "nova.pdf", type: "application/pdf", size: 10 } as File;
  const current = { src: "https://cdn.example.com/stara.pdf", fileName: "stara.pdf" };

  it("returns a durable uploaded ref", async () => {
    const upload = vi.fn().mockResolvedValue({ src: "https://cdn.example.com/nova.pdf", fileName: "nova.pdf" });
    await expect(uploadContentMedia({ upload }, "file", file, current)).resolves.toEqual({ status: "ready", asset: { src: "https://cdn.example.com/nova.pdf", fileName: "nova.pdf" } });
    expect(upload).toHaveBeenCalledWith("file", file);
  });

  it("preserves the previous ref on upload failure", async () => {
    const result = await uploadContentMedia({ upload: vi.fn().mockRejectedValue(new Error("Cloud error")) }, "file", file, current);
    expect(result).toEqual({ status: "error", asset: current, message: "Cloud error" });
  });

  it("refuses blob/data upload results", async () => {
    const result = await uploadContentMedia({ upload: vi.fn().mockResolvedValue({ src: "data:bad" }) }, "image", file);
    expect(result.status).toBe("error");
  });

  it("persisted asset output never contains a browser File object", () => {
    const parsed = contentAssetRefSchema.parse({ src: "https://cdn.example.com/file.pdf", browserFile: file });
    expect(parsed).toEqual({ src: "https://cdn.example.com/file.pdf" });
    expect(JSON.stringify(parsed)).not.toContain("browserFile");
  });

  it("reorders gallery refs immutably", () => {
    const source = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(moveMediaItem(source, 2, -1).map(({ id }) => id)).toEqual(["a", "c", "b"]);
    expect(source.map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("shared image field exposes remove and alt editing", async () => {
    const source = await readFile("src/components/content-composer/editor/MediaFields.tsx", "utf8");
    expect(source).toContain("Ukloni referencu");
    expect(source).toContain('label="Alt tekst"');
  });
});

describe("video provider resolution", () => {
  it("resolves YouTube, Vimeo and upload sources without provider leakage into blocks", () => {
    expect(resolveVideoSource({ provider: "youtube", url: "https://youtu.be/abc" })).toEqual({ kind: "embed", src: "https://www.youtube-nocookie.com/embed/abc" });
    expect(resolveVideoSource({ provider: "vimeo", url: "https://vimeo.com/12345" })).toEqual({ kind: "embed", src: "https://player.vimeo.com/video/12345" });
    expect(resolveVideoSource({ provider: "upload", media: { src: "https://cdn.example.com/video.mp4" } })).toEqual({ kind: "file", src: "https://cdn.example.com/video.mp4" });
    expect(resolveVideoSource({ provider: "youtube", url: "https://example.com/watch?v=x" }).kind).toBe("unavailable");
    expect(resolveVideoSource({ provider: "upload" } as never).kind).toBe("unavailable");
  });
});
