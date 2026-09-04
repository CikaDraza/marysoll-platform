import { describe, expect, it } from "vitest";
import {
  EDUCATION_INTENT_KEYS,
  EDUCATION_PUBLIC_FORMAT_LABELS,
  SKINCARE_TOPIC_KEYS,
  educationPublicFormatLabel,
  resolveEducationPublicFormat,
  resolveEducationTaxonomy,
  taxonomyHasIntent,
  taxonomyHasTopic,
} from "./taxonomy";

describe("Education taxonomy", () => {
  it("resolves exactly the skincare domain keys and Serbian labels", () => {
    const taxonomy = resolveEducationTaxonomy("skincare");
    expect(taxonomy?.topics.map(({ key }) => key)).toEqual(SKINCARE_TOPIC_KEYS);
    expect(taxonomy?.topics.map(({ label }) => label)).toEqual([
      "Procena kože",
      "Rutina i sastojci",
      "Promene i stanja kože",
      "Zaštita kože",
    ]);
    expect(taxonomy?.intents.map(({ key }) => key)).toEqual(
      EDUCATION_INTENT_KEYS,
    );
  });

  it("does not globally default unknown Education workspaces to skincare", () => {
    expect(resolveEducationTaxonomy(undefined)).toBeNull();
    expect(resolveEducationTaxonomy("english_language")).toBeNull();
  });

  it("validates topic and intent against the resolved domain", () => {
    const taxonomy = resolveEducationTaxonomy("skincare")!;
    expect(taxonomyHasTopic(taxonomy, "conditions")).toBe(true);
    expect(taxonomyHasTopic(taxonomy, "marketing")).toBe(false);
    expect(taxonomyHasIntent(taxonomy, "recognize")).toBe(true);
    expect(taxonomyHasIntent(taxonomy, "sell")).toBe(false);
  });

  it.each([
    ["video", "video", "Video"],
    ["article", "article", "Članak"],
    ["advice", "article", "Članak"],
    ["guide", "article", "Članak"],
    ["material", "article", "Članak"],
  ] as const)("maps legacy kind %s to public %s", (kind, format, label) => {
    expect(resolveEducationPublicFormat(kind)).toBe(format);
    expect(educationPublicFormatLabel(kind)).toBe(label);
    expect(EDUCATION_PUBLIC_FORMAT_LABELS[format]).toBe(label);
  });
});
