import { describe, expect, it } from "vitest";
import { EDUCATION_CONTENT_KINDS } from "@/types/education-content";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { landingBlockTypes } from "@/lib/content/schemas/landing-blocks";
import { canSeedPreset } from "@/components/education/education-content-editor-model";
import {
  educationPresetBlocks,
  missingRequiredVideoSource,
} from "./contentPresets";

let counter = 0;
const ids = () => `preset-${(counter += 1)}`;

describe("polazni blokovi po vrsti sadržaja", () => {
  it("svaka vrsta ima svoj polazni skup, i svi blokovi su iz deljenog registra", () => {
    for (const kind of EDUCATION_CONTENT_KINDS) {
      const blocks = educationPresetBlocks(kind, ids);

      expect(blocks.length).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(landingBlockTypes).toContain(block.type);
        expect(block.id).toBeTruthy();
      }
      // Redosled je smisao preseta, pa prioriteti moraju biti uzastopni.
      expect(blocks.map((block) => block.priority)).toEqual(
        blocks.map((_, index) => index + 1),
      );
    }
  });

  it("polazni blokovi se mogu sačuvati kao draft, ali ne i objaviti prazni", () => {
    for (const kind of EDUCATION_CONTENT_KINDS) {
      const blocks = educationPresetBlocks(kind, ids);

      // Nepopunjen preset je legitiman draft — to je polazište, ne sadržaj.
      expect(validateContentDocument(blocks, "draft").valid).toBe(true);
      // Ali prazan preset ne sme da prođe kao objavljen članak.
      const publish = validateContentDocument(blocks, "publish");
      expect(publish.blocks.every(({ status }) => status === "VALID")).toBe(false);
    }
  });

  it("nijedan preset ne ubacuje hero blok — naslov nosi strana, ne blok", () => {
    for (const kind of EDUCATION_CONTENT_KINDS) {
      expect(
        educationPresetBlocks(kind, ids).map((block) => block.type),
      ).not.toContain("HeroBlock");
    }
  });

  it("stručna ograda je u svakom presetu, jer je u svakom njenom materijalu", () => {
    for (const kind of EDUCATION_CONTENT_KINDS) {
      const callouts = educationPresetBlocks(kind, ids).filter(
        (block) => block.type === "CalloutBlock",
      );

      expect(callouts).toHaveLength(1);
      expect(callouts[0]).toMatchObject({ title: "Stručna ograda" });
    }
  });

  it("video počinje od videa, ne od praznog članka", () => {
    expect(educationPresetBlocks("video", ids)[0].type).toBe("VideoBlock");
  });

  it("materijal nudi preuzimanje, vodič korake i tabelu", () => {
    expect(educationPresetBlocks("material", ids).map((b) => b.type)).toContain(
      "FileDownloadBlock",
    );

    const guide = educationPresetBlocks("guide", ids).map((b) => b.type);
    expect(guide).toContain("ChecklistBlock");
    expect(guide).toContain("TableBlock");
  });

  it("članak prati njen obrazac: pasusi i nabrajanje unutar sekcije", () => {
    const article = educationPresetBlocks("article", ids);
    const withItems = article.find(
      (block) => block.type === "ArticleBlock" && "items" in block && block.items,
    );

    // Bez ovoga bi njena nabrajanja morala u ChecklistBlock, koji znači nešto
    // drugo — kvačice, a ne nabrojane činjenice.
    expect(withItems).toBeDefined();
  });
});

describe("preset ne sme da pregazi rad", () => {
  const state = (blocks: unknown[]) =>
    ({ blocks }) as Parameters<typeof canSeedPreset>[0];

  it("nudi se samo dok je sadržaj prazan", () => {
    expect(canSeedPreset(state([]))).toBe(true);
    expect(canSeedPreset(state([{ id: "a" }]))).toBe(false);
  });
});

describe("video izvor je obavezan za video sadržaj", () => {
  const videoBlock = (source?: unknown) =>
    ({ id: "v", type: "VideoBlock", priority: 1, source }) as unknown as Parameters<
      typeof missingRequiredVideoSource
    >[1][number];

  it("prazan video blok ne prolazi objavu", () => {
    expect(missingRequiredVideoSource("video", [videoBlock()])).toBe(true);
    expect(missingRequiredVideoSource("video", [])).toBe(true);
  });

  it("spoljni i otpremljeni izvor oba prolaze", () => {
    expect(
      missingRequiredVideoSource("video", [
        videoBlock({ provider: "youtube", url: "https://youtu.be/abc123" }),
      ]),
    ).toBe(false);
    expect(
      missingRequiredVideoSource("video", [
        videoBlock({ provider: "upload", media: { src: "https://cdn/x.mp4" } }),
      ]),
    ).toBe(false);
  });

  it("sakriven video blok se ne računa", () => {
    const hidden = {
      id: "v",
      type: "VideoBlock",
      priority: 1,
      visibility: "hidden",
      source: { provider: "youtube", url: "https://youtu.be/abc123" },
    } as unknown as Parameters<typeof missingRequiredVideoSource>[1][number];

    expect(missingRequiredVideoSource("video", [hidden])).toBe(true);
  });

  it("ostale vrste sadržaja ne traže video", () => {
    for (const kind of ["article", "advice", "guide", "material"] as const) {
      expect(missingRequiredVideoSource(kind, [])).toBe(false);
    }
  });
});
