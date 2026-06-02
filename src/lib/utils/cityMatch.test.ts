import { buildCityRegex } from "./cityMatch";

describe("buildCityRegex — diacritic-insensitive city matching", () => {
  it("matches Kruševac when DB stores diacritic form", () => {
    const re = buildCityRegex("Krusevac");
    expect(re.test("Kruševac")).toBe(true);
    expect(re.test("Krusevac")).toBe(true);
  });

  it("matches Krusevac when query has diacritics", () => {
    const re = buildCityRegex("Kruševac");
    expect(re.test("Krusevac")).toBe(true);
    expect(re.test("Kruševac")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(buildCityRegex("kruševac").test("KRUŠEVAC")).toBe(true);
  });

  it("matches Čačak / Cacak both ways", () => {
    expect(buildCityRegex("Cacak").test("Čačak")).toBe(true);
    expect(buildCityRegex("Čačak").test("Cacak")).toBe(true);
  });

  it("matches Niš / Nis both ways", () => {
    expect(buildCityRegex("Nis").test("Niš")).toBe(true);
    expect(buildCityRegex("Niš").test("Nis")).toBe(true);
  });

  it("does not match an unrelated city", () => {
    expect(buildCityRegex("Kruševac").test("Beograd")).toBe(false);
  });

  it("handles hyphen-to-space normalization", () => {
    expect(buildCityRegex("Novi-Sad").test("Novi Sad")).toBe(true);
  });

  it("escapes regex special characters safely", () => {
    expect(() => buildCityRegex("Grad (test)")).not.toThrow();
    expect(buildCityRegex("Grad (test)").test("Grad (test)")).toBe(true);
  });
});
