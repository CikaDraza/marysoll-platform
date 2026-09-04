import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlockList } from "@/components/content-composer/BlockList";
import { createDraftContentBlock } from "@/lib/content/editor/blockFactories";
import { landingBlockTypes } from "@/lib/content/schemas/landing-blocks";

/**
 * Blokovi se dele sa newsletterom i nose svoje landing omotače, a Education
 * članak ih poravnava iz `.edu-prose`. Ako blok stigne kao korenski element
 * koji taj selektor ne hvata, on jedini zadrži dvostruki `px-6` i vizuelno
 * iskoči iz kontejnera — tako je `ArticleBlock` (`<article>`) i promakao.
 */
const CSS = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

/** Tagovi koje `.edu-prose > :is(...)` poravnava sa kontejnerom članka. */
function alignedRootTags(): string[] {
  const rule = CSS.match(
    /\.edu-prose > :is\(([^)]*)\)\s*\{\s*max-width: none;/,
  );
  if (!rule) throw new Error("pravilo za poravnanje blokova nije pronađeno");
  return rule[1].split(",").map((tag) => tag.trim());
}

/** Korenski tag svakog bloka, onako kako ga BlockList stvarno renderuje. */
function rootTag(type: (typeof landingBlockTypes)[number]): string {
  const html = renderToStaticMarkup(
    <BlockList
      blocks={[createDraftContentBlock(type, 1, () => `${type}-id`)]}
      headingScope="section"
    />,
  );
  const match = html.match(/^<([a-z]+)[\s>]/);
  if (!match) throw new Error(`blok ${type} nema korenski element: ${html.slice(0, 80)}`);
  return match[1];
}

describe("Education telo članka poravnava svaki blok", () => {
  it("svaki korenski element bloka je pokriven `.edu-prose` pravilom", () => {
    const aligned = alignedRootTags();
    const uncovered = landingBlockTypes
      .map((type) => ({ type, tag: rootTag(type) }))
      .filter(({ tag }) => !aligned.includes(tag));

    expect(uncovered).toEqual([]);
  });

  it("`aside` blokovi dobijaju sopstveni unutrašnji razmak", () => {
    // Callout nema unutrašnji omotač: kad mu se padding samo skine, tekst
    // nalegne na ivicu okvira. Ovo je bio vidljivi simptom.
    expect(CSS).toMatch(/\.edu-prose > aside \{[^}]*padding-inline:/);
    expect(CSS).toMatch(/\.edu-prose > aside \{[^}]*padding-block:/);
  });

  /**
   * `globals.css` je nenaslojen, a Tailwind utility klase su u `@layer`, pa
   * nenaslojeno pravilo pobeđuje bez obzira na specifičnost. `margin-block: 0`
   * je tako ugasio `space-y-12` na omotaču i blokovi su se slepili. Ritam zato
   * mora da stoji uz to isto pravilo.
   */
  it("razmak između blokova stoji u istom pravilu koje gasi margine", () => {
    expect(CSS).toMatch(
      /\.edu-prose > :is\([^)]*\) \+ :is\([^)]*\) \{[^}]*margin-block-start:/,
    );
  });

  it("telo članka ne oslanja ritam na Tailwind `space-y-*`", () => {
    const view = readFileSync(
      path.join(process.cwd(), "src/components/tenant/EducationArticleView.tsx"),
      "utf8",
    );
    const body = view.match(/className="edu-prose[^"]*"/)?.[0] ?? "";

    expect(body).toBeTruthy();
    expect(body).not.toMatch(/space-y-/);
  });

  it("callout se renderuje kao `aside`, pa ga to pravilo stvarno pogađa", () => {
    expect(rootTag("CalloutBlock")).toBe("aside");
    expect(rootTag("ArticleBlock")).toBe("article");
  });
});
