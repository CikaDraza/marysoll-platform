import { describe, expect, it } from "vitest";
import { ALL_TWELVE_BLOCKS } from "@/lib/education/__fixtures__/education-blocks";
import type { EducationContentRecord } from "@/lib/education/content-document";
import {
  canAutosave,
  createPayload,
  educationContentOverview,
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
  accessMode: "public",
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
      isEducationEditorDirty({ ...baseline, accessMode: "private" }, baseline),
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
      accessMode: "public",
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
          accessMode: "private",
          status: "published",
          updatedAt: record.updatedAt,
          publishedSnapshot: {
            accessMode: "private",
            publishedAt: record.updatedAt,
          },
        },
      ],
      () => "29.08.2026.",
    );

    expect(row).toMatchObject({
      kindLabel: "Vodič",
      accessLabel: "Privatno",
      statusLabel: "Objavljeno",
      published: true,
      isPublic: false,
      updatedLabel: "29.08.2026.",
      href: "/education/content/1",
      hasUnpublished: false,
    });
  });

  it("zapis bez objavljene verzije nije „Objavljeno“, ma šta status tvrdio", () => {
    // Zatečen zapis pre backfill-a nema živu verziju, pa oznaka ne sme da tvrdi
    // da nešto stoji na sajtu.
    const [row] = educationContentRows(
      [
        {
          id: "1",
          title: "Legacy",
          slug: "legacy",
          kind: "article",
          accessMode: "public",
          status: "published",
          updatedAt: record.updatedAt,
          publishedSnapshot: null,
        },
      ],
      () => "",
    );

    expect(row.statusLabel).toBe("Draft");
  });
});

describe("oznaka objave", () => {
  const publishedAt = "2026-08-29T10:00:00.000Z";
  const live = {
    title: "Estetika lica",
    slug: "estetika-lica",
    kind: "article" as const,
    accessMode: "public" as const,
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

describe("pregled Edu Centra", () => {
  const summary = (over: Partial<typeof base> = {}) => ({ ...base, ...over });
  const base = {
    id: "1",
    title: "Tekst",
    slug: "tekst",
    kind: "article" as const,
    accessMode: "public" as const,
    status: "draft" as "draft" | "published",
    updatedAt: "2026-08-29T10:00:00.000Z",
    workingSavedAt: null as string | null,
    publishedSnapshot: null as {
      accessMode: "public" | "private";
      publishedAt: string;
    } | null,
  };

  it("prazan Edu Centar nema šta da pokaže", () => {
    expect(educationContentOverview([])).toEqual({
      total: 0,
      published: 0,
      drafts: 0,
      unpublishedChanges: 0,
      hasPublicContent: false,
    });
  });

  it("broji objavljeno, u pripremi i neobjavljene izmene", () => {
    const overview = educationContentOverview([
      summary({ id: "a" }),
      summary({
        id: "b",
        status: "published",
        publishedSnapshot: {
          accessMode: "public",
          publishedAt: "2026-08-29T10:00:00.000Z",
        },
      }),
      summary({
        id: "c",
        status: "published",
        workingSavedAt: "2026-08-29T11:00:00.000Z",
        publishedSnapshot: {
          accessMode: "private",
          publishedAt: "2026-08-29T10:00:00.000Z",
        },
      }),
    ]);

    expect(overview).toEqual({
      total: 3,
      published: 2,
      drafts: 1,
      unpublishedChanges: 1,
      hasPublicContent: true,
    });
  });

  it("javnog sadržaja nema dok objavljena verzija nije javna", () => {
    const overview = educationContentOverview([
      summary({
        status: "published",
        publishedSnapshot: {
          accessMode: "private",
          publishedAt: "2026-08-29T10:00:00.000Z",
        },
      }),
    ]);

    // Link „Vidi na sajtu" se ne sme ponuditi za privatan sadržaj.
    expect(overview.hasPublicContent).toBe(false);
    expect(overview.published).toBe(1);
  });
});

describe("tiho čuvanje", () => {
  const empty = emptyEducationEditorState();

  it("ne pravi zapis dok nema stvarnog rada", () => {
    expect(canAutosave(empty, false)).toBe(false);
    expect(canAutosave({ ...empty, title: "Estetika lica" }, false)).toBe(false);
    expect(canAutosave({ ...empty, blocks: ALL_TWELVE_BLOCKS }, false)).toBe(false);
  });

  it("pravi zapis čim postoji naslov i bar jedan blok", () => {
    expect(
      canAutosave(
        { ...empty, title: "Estetika lica", blocks: ALL_TWELVE_BLOCKS },
        false,
      ),
    ).toBe(true);
  });

  it("postojeći zapis se čuva i bez ijednog bloka — brisanje sadržaja je izmena", () => {
    expect(canAutosave({ ...empty, title: "Estetika lica" }, true)).toBe(true);
    expect(canAutosave(empty, true)).toBe(false);
  });
});
