import { describe, expect, it } from "vitest";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import {
  educationContentCreateSchema,
  educationPublishHostFailure,
  hasPublishableBlock,
  hasPublishedSnapshot,
  hasUnpublishedChanges,
  isBodyPubliclyAvailable,
  isPubliclyConsumable,
  normalizeEducationSlug,
  resolveEducationSlug,
  resolvePublicEducationContent,
} from "./content-document";

const article: ContentBlock = {
  id: "a1",
  type: "ArticleBlock",
  priority: 1,
  title: "Estetika lica",
  paragraphs: ["Prvi pasus stručnog teksta."],
};

describe("education slug", () => {
  it("transliteruje i normalizuje korisnički unos", () => {
    expect(normalizeEducationSlug(" Nega Kože Zimi ")).toBe("nega-koze-zimi");
    expect(normalizeEducationSlug("https://marysoll.com/estetika-lica")).toBe(
      "estetika-lica",
    );
    expect(normalizeEducationSlug(undefined)).toBe("");
  });

  it("izvodi slug iz naslova samo kad nije eksplicitno unet", () => {
    expect(
      resolveEducationSlug({ requestedSlug: "moj-slug", title: "Drugi naslov" }),
    ).toBe("moj-slug");
    expect(resolveEducationSlug({ title: "Estetika lica" })).toBe("estetika-lica");
  });

  it("ne prepisuje postojeći slug kad se promeni naslov", () => {
    expect(
      resolveEducationSlug({
        requestedSlug: undefined,
        title: "Novi naslov",
        fallback: "stari-slug",
      }),
    ).toBe("stari-slug");
  });
});

describe("education metadata contract", () => {
  it("traži naslov i poznate enum vrednosti", () => {
    expect(
      educationContentCreateSchema.safeParse({
        title: "",
        kind: "article",
        accessMode: "public",
      }).success,
    ).toBe(false);

    expect(
      educationContentCreateSchema.safeParse({
        title: "Estetika lica",
        kind: "course",
        accessMode: "public",
      }).success,
    ).toBe(false);

    expect(
      educationContentCreateSchema.safeParse({
        title: "Estetika lica",
        kind: "article",
        accessMode: "private",
      }).success,
    ).toBe(true);
  });
});

describe("publish host precondition", () => {
  it("traži bar jedan vidljiv i kompletan blok", () => {
    const empty = validateContentDocument([], "publish");
    expect(empty.valid).toBe(true);
    expect(hasPublishableBlock(empty)).toBe(false);

    const hiddenOnly = validateContentDocument(
      [{ ...article, visibility: "hidden" }],
      "publish",
    );
    expect(hiddenOnly.valid).toBe(true);
    expect(hasPublishableBlock(hiddenOnly)).toBe(false);

    const ready = validateContentDocument([article], "publish");
    expect(hasPublishableBlock(ready)).toBe(true);
  });

  it("host odbijanje nosi razumljivu poruku i nevalidan ishod", () => {
    const failure = educationPublishHostFailure(
      validateContentDocument([], "publish"),
    );

    expect(failure.valid).toBe(false);
    expect(failure.issues[0].message).toMatch(/vidljiv i kompletan blok/);
  });
});

describe("javni izvor istine je snapshot, ne radna kopija", () => {
  const snapshot = (accessMode: "public" | "gated" | "private") => ({
    title: "Estetika lica",
    slug: "estetika-lica",
    kind: "article" as const,
    accessMode,
    blocks: [article],
    publishedAt: new Date("2026-08-29T10:00:00.000Z"),
  });

  it("zaključan sadržaj je javno otkriven, ali mu telo nije javno", () => {
    const gated = { publishedSnapshot: snapshot("gated") };

    expect(isPubliclyConsumable(gated)).toBe(true);
    expect(isBodyPubliclyAvailable(gated)).toBe(false);
    expect(isBodyPubliclyAvailable({ publishedSnapshot: snapshot("public") })).toBe(
      true,
    );
  });

  it("javno je samo ono što ima objavljen public ili gated snapshot", () => {
    expect(isPubliclyConsumable({ publishedSnapshot: snapshot("public") })).toBe(true);
    expect(isPubliclyConsumable({ publishedSnapshot: snapshot("private") })).toBe(false);
    expect(isPubliclyConsumable({ publishedSnapshot: null })).toBe(false);
    expect(isPubliclyConsumable(undefined)).toBe(false);
  });

  it("zapis bez snapshot-a nije javan ni kad mu je status published", () => {
    // Fail-closed: zatečen zapis pre backfill-a ostaje nevidljiv umesto da procuri.
    const legacy = { status: "published", accessMode: "public", blocks: [article] };

    expect(isPubliclyConsumable(legacy as never)).toBe(false);
    expect(hasPublishedSnapshot(legacy as never)).toBe(false);
    expect(resolvePublicEducationContent(legacy as never)).toBeNull();
  });

  it("javni prikaz dobija snapshot, nikad radnu kopiju", () => {
    const record = {
      title: "Radna izmena koja još nije objavljena",
      slug: "proporcije-lica",
      accessMode: "private" as const,
      publishedSnapshot: snapshot("public"),
    };

    expect(resolvePublicEducationContent(record)).toBe(record.publishedSnapshot);
    expect(resolvePublicEducationContent(record)?.slug).toBe("estetika-lica");
  });
});

describe("neobjavljene izmene", () => {
  const publishedAt = "2026-08-29T10:00:00.000Z";
  const live = {
    title: "Estetika lica",
    slug: "estetika-lica",
    kind: "article" as const,
    accessMode: "public" as const,
    publishedAt,
  };

  it("prijavljuje izmene tek kad je Save posle Publish-a", () => {
    expect(
      hasUnpublishedChanges({ workingSavedAt: null, publishedSnapshot: live }),
    ).toBe(false);
    expect(
      hasUnpublishedChanges({
        workingSavedAt: "2026-08-29T09:59:00.000Z",
        publishedSnapshot: live,
      }),
    ).toBe(false);
    expect(
      hasUnpublishedChanges({
        workingSavedAt: "2026-08-29T10:05:00.000Z",
        publishedSnapshot: live,
      }),
    ).toBe(true);
  });

  it("neobjavljen zapis nema šta da razlikuje", () => {
    expect(
      hasUnpublishedChanges({
        workingSavedAt: "2026-08-29T10:05:00.000Z",
        publishedSnapshot: null,
      }),
    ).toBe(false);
  });
});
