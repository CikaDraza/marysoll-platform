import { describe, expect, it } from "vitest";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import {
  educationContentCreateSchema,
  educationPublishHostFailure,
  hasPublishableBlock,
  isPubliclyConsumable,
  normalizeEducationSlug,
  resolveEducationSlug,
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
        visibility: "public",
      }).success,
    ).toBe(false);

    expect(
      educationContentCreateSchema.safeParse({
        title: "Estetika lica",
        kind: "course",
        visibility: "public",
      }).success,
    ).toBe(false);

    expect(
      educationContentCreateSchema.safeParse({
        title: "Estetika lica",
        kind: "article",
        visibility: "private",
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

describe("visibility nije status", () => {
  it("javno konzumira samo published + public", () => {
    expect(isPubliclyConsumable({ status: "published", visibility: "public" })).toBe(true);
    expect(isPubliclyConsumable({ status: "published", visibility: "private" })).toBe(false);
    expect(isPubliclyConsumable({ status: "draft", visibility: "public" })).toBe(false);
    expect(isPubliclyConsumable({ status: "draft", visibility: "private" })).toBe(false);
  });
});
