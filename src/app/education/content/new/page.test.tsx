import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NewEducationContentPage from "./page";

describe("direct Education /new route", () => {
  it.each([undefined, "unknown", ["article"]])(
    "za missing/invalid start %j bezbedno prikazuje chooser",
    async (start) => {
      const element = await NewEducationContentPage({
        searchParams: Promise.resolve({ start }),
      });
      const html = renderToStaticMarkup(element);
      expect(html).toContain("Kako želite da počnete?");
      expect(html).toContain("Napiši članak");
      expect(html).toContain("Uvezi dokument");
      expect(html).toContain("Dodaj video");
    },
  );
});
