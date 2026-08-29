import { describe, expect, it } from "vitest";
import { ALL_TWELVE_BLOCKS } from "./__fixtures__/education-blocks";
import { buildPublishedSnapshot } from "./content-document";
import { classifyEducationRecord } from "./publishedSnapshotBackfill";

const publishedAt = new Date("2026-08-29T10:00:00.000Z");

const legacyPublished = {
  status: "published",
  title: "Estetika lica",
  slug: "estetika-lica",
  kind: "article",
  visibility: "public",
  blocks: ALL_TWELVE_BLOCKS,
  seo: { title: "Estetika lica" },
  updatedAt: publishedAt,
};

describe("backfill objavljene verzije", () => {
  it("zatečenu radnu kopiju objavljenog zapisa uzima kao polaznu javnu verziju", () => {
    const decision = classifyEducationRecord(legacyPublished);

    expect(decision.kind).toBe("backfill");
    if (decision.kind !== "backfill") return;
    expect(decision.snapshot).toMatchObject({
      title: "Estetika lica",
      slug: "estetika-lica",
      visibility: "public",
      publishedAt,
    });
    expect(decision.snapshot.blocks).toEqual(ALL_TWELVE_BLOCKS);
  });

  it("nikada ne objavljuje draft zapis", () => {
    expect(classifyEducationRecord({ ...legacyPublished, status: "draft" })).toEqual({
      kind: "skip",
      reason: "draft",
    });
  });

  it("idempotentan je — zapis sa objavljenom verzijom se ne dira", () => {
    expect(
      classifyEducationRecord({
        ...legacyPublished,
        publishedSnapshot: { slug: "estetika-lica" },
      }),
    ).toEqual({ kind: "skip", reason: "already-published-snapshot" });
  });

  it("pada na updatedAt kada stariji zapis nema vreme objave", () => {
    const decision = classifyEducationRecord({
      ...legacyPublished,
      updatedAt: "2026-08-01T08:00:00.000Z",
    });

    if (decision.kind !== "backfill") throw new Error("očekivan backfill");
    expect(decision.snapshot.publishedAt.toISOString()).toBe(
      "2026-08-01T08:00:00.000Z",
    );
  });

  it("proizvodi isti oblik snapshot-a kao objava", () => {
    const decision = classifyEducationRecord(legacyPublished);
    if (decision.kind !== "backfill") throw new Error("očekivan backfill");

    // CLI modul je bez importa, pa oblik mora ostati zaključan testom.
    expect(Object.keys(decision.snapshot).sort()).toEqual(
      Object.keys(
        buildPublishedSnapshot(
          {
            title: "Estetika lica",
            slug: "estetika-lica",
            kind: "article",
            visibility: "public",
            blocks: ALL_TWELVE_BLOCKS,
            seo: { title: "Estetika lica" },
          },
          publishedAt,
        ),
      ).sort(),
    );
  });
});
