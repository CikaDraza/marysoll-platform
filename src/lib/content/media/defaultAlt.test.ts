import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { landingBlockSchema } from "@/lib/content/schemas/landing-blocks";

const EDITORS = path.join(
  process.cwd(),
  "src/components/content-composer/editor/editors",
);

/**
 * Objava traži alt za svaku sliku. Bez polaznog alta autor posle pisanja mora
 * da obilazi blokove i traži gde nedostaje — greška se javi tek pri objavi, i
 * to bez pokazivanja gde je.
 */
describe("polazni alt teksta slike", () => {
  it("svaki editor sa slikom nudi polazni alt iz svog naslova", () => {
    const offenders = readdirSync(EDITORS)
      .filter((file) => file.endsWith(".tsx"))
      .filter((file) => {
        const source = readFileSync(path.join(EDITORS, file), "utf8");
        return (
          source.includes("<ImageMediaField") && !source.includes("defaultAlt=")
        );
      });

    expect(offenders).toEqual([]);
  });

  it("prazan alt i dalje obara objavu — polazni alt je pomoć, ne zaobilaženje", () => {
    const block = {
      id: "a",
      type: "ArticleBlock",
      priority: 1,
      title: "Estetika lica",
      paragraphs: ["Tekst."],
      image: { src: "https://cdn.example.com/a.jpg", alt: "" },
    };

    expect(landingBlockSchema.safeParse(block).success).toBe(false);
    expect(
      landingBlockSchema.safeParse({
        ...block,
        image: { ...block.image, alt: "Estetika lica" },
      }).success,
    ).toBe(true);
  });
});
