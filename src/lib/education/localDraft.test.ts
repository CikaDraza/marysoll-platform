import { describe, expect, it } from "vitest";
import { localDraftKey, shouldOfferRecovery } from "./localDraft";

const draft = (savedAt: number) => ({ savedAt });

describe("lokalna kopija radne verzije", () => {
  it("ključ nosi tenant, jer admin origin dele svi saloni", () => {
    expect(localDraftKey("tenant-a", "content-1")).toBe("tenant-a:content-1");
    expect(localDraftKey("tenant-b", "content-1")).not.toBe(
      localDraftKey("tenant-a", "content-1"),
    );
  });

  it("ne nudi se kad je server već video to isto ili novije", () => {
    expect(
      shouldOfferRecovery({
        draft: draft(new Date("2026-08-30T10:00:00.000Z").getTime()),
        serverWorkingSavedAt: "2026-08-30T10:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      shouldOfferRecovery({
        draft: draft(new Date("2026-08-30T09:00:00.000Z").getTime()),
        serverWorkingSavedAt: "2026-08-30T10:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("nudi se samo kad je lokalna kopija stvarno novija", () => {
    expect(
      shouldOfferRecovery({
        draft: draft(new Date("2026-08-30T10:05:00.000Z").getTime()),
        serverWorkingSavedAt: "2026-08-30T10:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("zapis koji server nikad nije sačuvao uvek ustupa mesto lokalnoj kopiji", () => {
    expect(
      shouldOfferRecovery({ draft: draft(Date.now()), serverWorkingSavedAt: null }),
    ).toBe(true);
    expect(
      shouldOfferRecovery({
        draft: draft(Date.now()),
        serverWorkingSavedAt: "nije datum",
      }),
    ).toBe(true);
  });

  it("bez lokalne kopije nema šta da se ponudi", () => {
    expect(
      shouldOfferRecovery({ draft: null, serverWorkingSavedAt: null }),
    ).toBe(false);
  });
});

describe("durable mirror without IndexedDB", () => {
  it("preserves a new titleless draft and isolates tenants", async () => {
    const { vi } = await import("vitest");
    const entries = new Map<string, string>();
    vi.stubGlobal("indexedDB", undefined);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
    });
    try {
      const { putLocalDraft, readLocalDraft, clearLocalDraftIfConfirmed } = await import("./localDraft");
      const { initializeEducationEditorState } = await import("@/components/education/education-content-editor-model");
      const state = initializeEducationEditorState(undefined, "article", () => "block-test");
      const local = { key: localDraftKey("a", "new:article"), tenantId: "a", contentId: "new:article", savedAt: 20, state };
      expect(await putLocalDraft(local)).toBe(true);
      expect(await readLocalDraft("a", "new:article")).toEqual(local);
      expect(await readLocalDraft("b", "new:article")).toBeNull();
      await clearLocalDraftIfConfirmed("a", "new:article", 10);
      expect(await readLocalDraft("a", "new:article")).toEqual(local);
      await clearLocalDraftIfConfirmed("a", "new:article", 20);
      expect(await readLocalDraft("a", "new:article")).toBeNull();
    } finally { vi.unstubAllGlobals(); }
  });
});
