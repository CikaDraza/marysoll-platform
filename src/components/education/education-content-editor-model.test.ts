import { describe, expect, it } from "vitest";
import { ALL_TWELVE_BLOCKS } from "@/lib/education/__fixtures__/education-blocks";
import { moveBlockRelativeToVisible } from "@/lib/content/editor/blockOperations";
import {
  educationPresetBlocks,
  primaryVideoBlockId,
} from "@/lib/education/contentPresets";
import type { EducationContentRecord } from "@/lib/education/content-document";
import {
  canAutosave,
  applyEducationImportDraft,
  createPayload,
  educationContentOverview,
  educationPublicationStateFromRecord,
  publicationLabel,
  editorStateFromRecord,
  educationContentRows,
  emptyEducationEditorState,
  isEducationEditorDirty,
  initializeEducationEditorState,
  previewSlug,
  updatePayload,
} from "./education-content-editor-model";

let generatedId = 0;
const nextId = () => `editor-${(generatedId += 1)}`;

describe("inicijalizacija E2 editora", () => {
  it("article seeduje blokove jednom, ali samo otvaranje ne može napraviti zapis", () => {
    const state = initializeEducationEditorState(undefined, "article", nextId);
    expect(state.kind).toBe("article");
    expect(state.blocks.length).toBeGreaterThan(0);
    expect(canAutosave(state, false)).toBe(false);
  });

  it("import počinje praznim article draftom", () => {
    const state = initializeEducationEditorState(undefined, "import", nextId);
    expect(state).toMatchObject({ kind: "article", blocks: [] });
    expect(canAutosave(state, false)).toBe(false);
  });

  it("video odmah ima jedan VideoBlock", () => {
    const state = initializeEducationEditorState(undefined, "video", nextId);
    expect(state.kind).toBe("video");
    expect(state.blocks.filter(({ type }) => type === "VideoBlock")).toHaveLength(1);
    expect(canAutosave(state, false)).toBe(false);
  });

  it.each(["advice", "guide", "material", "video"] as const)(
    "postojeći %s zapis pobeđuje start parametar i čuva kind",
    (kind) => {
      const existing = { ...record, kind };
      const state = initializeEducationEditorState(existing, "article", nextId);
      expect(state.kind).toBe(kind);
      expect(createPayload(state).kind).toBe(kind);
      expect(updatePayload({ ...state, title: "Drugi naslov" }, state)).toEqual({
        title: "Drugi naslov",
      });
    },
  );

  it("import rezultat postaje uređiv članak bez FileDownloadBlock-a", () => {
    const before = initializeEducationEditorState(undefined, "import", nextId);
    const imported = applyEducationImportDraft(before, {
      title: "Uvezen naslov",
      hero: { subtitle: "Uvezen kratak opis" },
      blocks: [{
        id: "imported-article",
        type: "ArticleBlock",
        priority: 1,
        title: "Sekcija",
        paragraphs: ["Tekst"],
      }],
    });

    expect(imported).toMatchObject({
      kind: "article",
      title: "Uvezen naslov",
      hero: { subtitle: "Uvezen kratak opis" },
    });
    expect(imported.blocks.map(({ type }) => type)).toEqual(["ArticleBlock"]);
  });
});

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

describe("kucanje dok traje čuvanje", () => {
  it("izmene otkucane tokom zahteva ostaju i idu sledećim čuvanjem", () => {
    // Ovo je ugovor koji sprečava gubitak teksta: posle uspeha se pomera samo
    // polazište (ono što server sada drži), a ne i tekuće stanje editora.
    const baseline = editorStateFromRecord(record);
    const sent = { ...baseline, title: "Prva izmena" };
    const typedMeanwhile = { ...sent, title: "Prva izmena, pa još malo" };

    expect(updatePayload(sent, baseline)).toEqual({ title: "Prva izmena" });

    // Server je potvrdio `sent`; polazište postaje `sent`.
    expect(isEducationEditorDirty(typedMeanwhile, sent)).toBe(true);
    expect(updatePayload(typedMeanwhile, sent)).toEqual({
      title: "Prva izmena, pa još malo",
    });
    expect(isEducationEditorDirty(sent, sent)).toBe(false);
  });
});

/**
 * Strelica koja u filtriranom prikazu nema vidljivog partnera ne sme da napravi
 * izmenu: nevidljiva promena `blocks[]` bi pokrenula autosave i novu reviziju
 * bez ijedne promene koju je vlasnica videla.
 */
describe("pomeranje bez vidljivog partnera ne prlja dokument", () => {
  let sequence = 0;
  const videoBlocks = educationPresetBlocks("video", () => `move-${++sequence}`);
  const baseline = { ...emptyEducationEditorState(), kind: "video" as const, blocks: videoBlocks };
  const anchoredId = primaryVideoBlockId("video", videoBlocks);

  it("usidren video nema partnera ni u jednom smeru", () => {
    const movableIds = videoBlocks
      .filter(({ type }) => type === "VideoBlock")
      .filter(({ id }) => id !== anchoredId)
      .map(({ id }) => id);

    for (const direction of [-1, 1] as const) {
      const blocks = moveBlockRelativeToVisible(
        videoBlocks,
        movableIds,
        anchoredId ?? "",
        direction,
      );

      expect(blocks.map(({ id }) => id)).toEqual(
        videoBlocks.map(({ id }) => id),
      );
      expect(isEducationEditorDirty({ ...baseline, blocks }, baseline)).toBe(false);
      expect(updatePayload({ ...baseline, blocks }, baseline)).toEqual({});
    }
  });

  it("prvi prateći blok nema šta da zameni iznad sebe", () => {
    const supportingIds = videoBlocks
      .filter(({ type }) => type !== "VideoBlock")
      .map(({ id }) => id);
    const blocks = moveBlockRelativeToVisible(
      videoBlocks,
      supportingIds,
      supportingIds[0],
      -1,
    );

    expect(isEducationEditorDirty({ ...baseline, blocks }, baseline)).toBe(false);
    expect(updatePayload({ ...baseline, blocks }, baseline)).toEqual({});
  });

  it("stvarna zamena dva vidljiva bloka jeste izmena", () => {
    const supportingIds = videoBlocks
      .filter(({ type }) => type !== "VideoBlock")
      .map(({ id }) => id);
    const blocks = moveBlockRelativeToVisible(
      videoBlocks,
      supportingIds,
      supportingIds[0],
      1,
    );

    expect(isEducationEditorDirty({ ...baseline, blocks }, baseline)).toBe(true);
    expect(blocks[0].id).toBe(anchoredId);
  });
});

/**
 * Taxonomy default je odlučen: NEMA ga. Vidi `authoringStart.test.ts` za razlog
 * — ovde se zaključava da ni jedan šav početnog stanja ne ubaci vrednost.
 */
describe("početno stanje ne bira temu ni cilj", () => {
  it.each(["article", "import", "video"] as const)(
    "%s start ostavlja oba ključa nepostavljena",
    (mode) => {
      const state = initializeEducationEditorState(
        undefined,
        mode,
        (() => {
          let n = 0;
          return () => `tax-${mode}-${++n}`;
        })(),
      );

      expect(state.topicKey).toBeUndefined();
      expect(state.intentKey).toBeUndefined();
    },
  );

  it("prvo čuvanje ne šalje temu ni cilj koje vlasnica nije izabrala", () => {
    const state = initializeEducationEditorState(
      undefined,
      "article",
      (() => {
        let n = 0;
        return () => `payload-${++n}`;
      })(),
    );
    const payload = createPayload({ ...state, title: "Bez teme" });

    expect(payload.topicKey).toBeUndefined();
    expect(payload.intentKey).toBeUndefined();
  });

  it("postojeći zapis zadržava svoj izbor", () => {
    const state = initializeEducationEditorState(
      { ...record, topicKey: "conditions", intentKey: "care" },
      "video",
      () => "unused",
    );

    expect(state.topicKey).toBe("conditions");
    expect(state.intentKey).toBe("care");
  });
});
