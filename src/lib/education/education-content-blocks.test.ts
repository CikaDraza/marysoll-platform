import { describe, expect, it } from "vitest";
import { landingBlockTypes } from "@/lib/content/schemas/landing-blocks";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { blockRegistry } from "@/lib/content/registry/blockRegistry";
import { ALL_TWELVE_BLOCKS } from "./__fixtures__/education-blocks";

describe("EducationContent koristi shared Content Composer blokove", () => {
  it("pokriva tačno svih 12 registrovanih tipova, bez education-specific bloka", () => {
    const used = ALL_TWELVE_BLOCKS.map(({ type }) => type).sort();

    expect(used).toEqual([...landingBlockTypes].sort());
    expect(Object.keys(blockRegistry).sort()).toEqual(used);
  });

  it("svaki blok je publish-ready kroz shared validator", () => {
    const validation = validateContentDocument(ALL_TWELVE_BLOCKS, "publish");

    expect(validation.valid).toBe(true);
    expect(
      validation.blocks.every(({ status }) => status === "VALID"),
    ).toBe(true);
  });

  it("blokovi prežive persistence round-trip bez tihog odsecanja", () => {
    // Ovo je isti put kojim blokovi idu do Mongo `Mixed` polja i nazad.
    const roundTripped = JSON.parse(
      JSON.stringify(ALL_TWELVE_BLOCKS),
    ) as typeof ALL_TWELVE_BLOCKS;

    expect(roundTripped).toEqual(ALL_TWELVE_BLOCKS);
    expect(validateContentDocument(roundTripped, "publish").valid).toBe(true);
  });

  it("media reference ostaju trajne adrese, bez File/blob/data tragova", () => {
    const serialized = JSON.stringify(ALL_TWELVE_BLOCKS);

    expect(serialized).not.toMatch(/blob:|data:/);
    expect(serialized).toMatch(/https:\/\/cdn\.example\.com\/vodic\.pdf/);
    expect(serialized).toMatch(/https:\/\/cdn\.example\.com\/primer\.jpg/);
  });
});
