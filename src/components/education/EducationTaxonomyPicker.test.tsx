import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resolveEducationTaxonomy } from "@/lib/education/taxonomy";
import { EducationTaxonomyPicker } from "./EducationTaxonomyPicker";

describe("Education taxonomy cards", () => {
  it("renderuje četiri domain topic i četiri intent izbora sa stabilnim ključevima", () => {
    const taxonomy = resolveEducationTaxonomy("skincare");
    expect(taxonomy).not.toBeNull();
    const html = renderToStaticMarkup(
      <EducationTaxonomyPicker
        taxonomy={taxonomy!}
        topicKey="conditions"
        intentKey="recognize"
        onTopicChange={() => undefined}
        onIntentChange={() => undefined}
      />,
    );

    expect((html.match(/name="education-topic"/g) ?? [])).toHaveLength(4);
    expect((html.match(/name="education-intent"/g) ?? [])).toHaveLength(4);
    expect(html).toContain('value="conditions"');
    expect(html).toContain('value="recognize"');
    expect(html).toContain("Akne, crvenilo");
  });

  it("ne postoji UI koji može da izmisli skincare bez resolved taxonomy-ja", () => {
    expect(resolveEducationTaxonomy(undefined)).toBeNull();
    expect(resolveEducationTaxonomy("future-domain")).toBeNull();
  });
});
