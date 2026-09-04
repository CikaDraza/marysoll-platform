import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EducationCreationChooser } from "./EducationCreationChooser";

describe("Education creation chooser", () => {
  it("prikazuje tri jasna načina početka sa typed adresama", () => {
    const html = renderToStaticMarkup(<EducationCreationChooser />);

    expect(html).toContain("Napiši članak");
    expect(html).toContain("Uvezi dokument");
    expect(html).toContain("Dodaj video");
    expect(html).toContain("/education/content/new?start=article");
    expect(html).toContain("/education/content/new?start=import");
    expect(html).toContain("/education/content/new?start=video");
  });
});
