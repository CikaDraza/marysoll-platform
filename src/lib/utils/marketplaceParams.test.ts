import { resolveSalonLimit } from "./marketplaceParams";

describe("resolveSalonLimit", () => {
  it("defaults to 5 when param is missing (homepage showcase)", () => {
    expect(resolveSalonLimit(null)).toBe(5);
  });

  it("defaults to 5 for non-numeric values", () => {
    expect(resolveSalonLimit("abc")).toBe(5);
  });

  it("defaults to 5 for zero or negative", () => {
    expect(resolveSalonLimit("0")).toBe(5);
    expect(resolveSalonLimit("-10")).toBe(5);
  });

  it("returns the requested limit when valid (AI/platform-knowledge)", () => {
    expect(resolveSalonLimit("100")).toBe(100);
  });

  it("clamps to a max of 200", () => {
    expect(resolveSalonLimit("9999")).toBe(200);
  });

  it("truncates fractional values", () => {
    expect(resolveSalonLimit("12.9")).toBe(12);
  });
});
