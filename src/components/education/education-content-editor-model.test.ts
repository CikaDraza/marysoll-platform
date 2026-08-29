import { describe, expect, it } from "vitest";
import { ALL_TWELVE_BLOCKS } from "@/lib/education/__fixtures__/education-blocks";
import type { EducationContentRecord } from "@/lib/education/content-document";
import {
  createPayload,
  educationPublicationStateFromRecord,
  publicationLabel,
  editorStateFromRecord,
  educationContentRows,
  emptyEducationEditorState,
  isEducationEditorDirty,
  previewSlug,
  updatePayload,
} from "./education-content-editor-model";

const record: EducationContentRecord = {
  id: "1",
  title: "Estetika lica",
  slug: "estetika-lica",
  kind: "article",
  visibility: "public",
  status: "draft",
  updatedAt: "2026-08-29T10:00:00.000Z",
  blocks: ALL_TWELVE_BLOCKS,
  seo: { title: "Estetika lica" },
};

describe("dirty state", () => {
  it("prazan novi sadržaj nije prljav dok se nešto ne unese", () => {
    const empty = emptyEducationEditorState();

    expect(isEducationEditorDirty(empty, null)).toBe(false);
    expect(isEducationEditorDirty({ ...empty, title: "Estetika" }, null)).toBe(true);
    expect(
      isEducationEditorDirty({ ...empty, blocks: ALL_TWELVE_BLOCKS }, null),
    ).toBe(true);
  });

  it("učitan zapis je čist dok se nešto ne promeni", () => {
    const baseline = editorStateFromRecord(record);

    expect(isEducationEditorDirty(baseline, baseline)).toBe(false);
    expect(
      isEducationEditorDirty({ ...baseline, title: "Drugi" }, baseline),
    ).toBe(true);
    expect(
      isEducationEditorDirty({ ...baseline, visibility: "private" }, baseline),
    ).toBe(true);
    expect(
      isEducationEditorDirty(
        { ...baseline, blocks: baseline.blocks.slice(1) },
        baseline,
      ),
    ).toBe(true);
  });

  it("uspešno čuvanje vraća stanje na čisto", () => {
    const baseline = editorStateFromRecord(record);
    const edited = { ...baseline, title: "Novi naslov" };
    const afterSave = editorStateFromRecord({ ...record, title: "Novi naslov" });

    expect(isEducationEditorDirty(edited, baseline)).toBe(true);
    expect(isEducationEditorDirty(afterSave, afterSave)).toBe(false);
  });
});

describe("payload", () => {
  it("novi sadržaj izvodi slug iz naslova", () => {
    const state = { ...emptyEducationEditorState(), title: "Nega kože zimi" };

    expect(previewSlug(state)).toBe("nega-koze-zimi");
    expect(createPayload(state)).toMatchObject({
      title: "Nega kože zimi",
      slug: "nega-koze-zimi",
      kind: "article",
      visibility: "public",
    });
  });

  it("ručno unet slug pobeđuje naslov", () => {
    const state = {
      ...emptyEducationEditorState(),
      title: "Estetika lica",
      slug: "moj-izbor",
      slugTouched: true,
    };

    expect(createPayload(state).slug).toBe("moj-izbor");
  });

  it("PATCH nosi samo stvarne izmene", () => {
    const baseline = editorStateFromRecord(record);

    expect(updatePayload(baseline, baseline)).toEqual({});
    expect(updatePayload({ ...baseline, title: "Drugi" }, baseline)).toEqual({
      title: "Drugi",
    });
    expect(
      updatePayload({ ...baseline, blocks: ALL_TWELVE_BLOCKS.slice(0, 2) }, baseline),
    ).toEqual({ blocks: ALL_TWELVE_BLOCKS.slice(0, 2) });
  });

  it("promena naslova ne prepisuje ranije potvrđen slug", () => {
    const baseline = editorStateFromRecord(record);

    expect(
      updatePayload({ ...baseline, title: "Sasvim drugi naslov" }, baseline),
    ).not.toHaveProperty("slug");
  });
});

describe("lista", () => {
  it("projektuje prazan i popunjen spisak sa razumljivim oznakama", () => {
    expect(educationContentRows([], () => "")).toEqual([]);

    const [row] = educationContentRows(
      [
        {
          id: "1",
          title: "Estetika lica",
          slug: "estetika-lica",
          kind: "guide",
          visibility: "private",
          status: "published",
          updatedAt: record.updatedAt,
        },
      ],
      () => "29.08.2026.",
    );

    expect(row).toMatchObject({
      kindLabel: "Vodič",
      visibilityLabel: "Privatno",
      statusLabel: "Objavljeno",
      published: true,
      isPublic: false,
      updatedLabel: "29.08.2026.",
      href: "/education/content/1",
    });
  });
});

describe("oznaka objave", () => {
  const publishedAt = "2026-08-29T10:00:00.000Z";
  const live = {
    title: "Estetika lica",
    slug: "estetika-lica",
    kind: "article" as const,
    visibility: "public" as const,
    publishedAt,
  };

  it("nikad objavljen zapis je Draft", () => {
    expect(
      publicationLabel({ status: "draft", publishedSnapshot: null, workingSavedAt: null }),
    ).toBe("Draft");
  });

  it("odmah po objavi je samo Objavljeno", () => {
    expect(
      publicationLabel({
        status: "published",
        publishedSnapshot: live,
        workingSavedAt: "2026-08-29T09:58:00.000Z",
      }),
    ).toBe("Objavljeno");
  });

  it("sačuvana izmena posle objave se vidi kao neobjavljena", () => {
    expect(
      publicationLabel({
        status: "published",
        publishedSnapshot: live,
        workingSavedAt: "2026-08-29T10:07:00.000Z",
      }),
    ).toBe("Objavljeno · neobjavljene izmene");
  });

  it("stanje se čita iz zapisa, ne iz poređenja blokova", () => {
    expect(
      educationPublicationStateFromRecord({
        ...record,
        status: "published",
        publishedSnapshot: live,
        workingSavedAt: "2026-08-29T10:07:00.000Z",
      }),
    ).toEqual({
      status: "published",
      publishedSnapshot: live,
      workingSavedAt: "2026-08-29T10:07:00.000Z",
    });
  });
});
