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
