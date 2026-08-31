import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { outlineFromLines } from "./fromLines";
import { draftFromOutline, summarizeOutline } from "./toBlocks";

/**
 * Acceptance nad STVARNIM Marininim materijalima, ne nad izmišljenim tekstom.
 *
 * PDF ne nosi strukturu — metak nabrajanja je crtež — pa je uvoz pogađanje po
 * definiciji. Zato se ovde ne meri savršenstvo nego da li rezultat vredi kao
 * polazni draft: da li su naslov, sekcije i tekst na svom mestu i da li se
 * može sačuvati.
 */
const FIXTURES = path.join(process.cwd(), "docs/marina-pdf");

async function importPdf(file: string) {
  const buffer = new Uint8Array(await readFile(path.join(FIXTURES, file)));
  const { text } = await extractText(await getDocumentProxy(buffer), {
    mergePages: true,
  });
  const outline = outlineFromLines(text);
  return { outline, draft: draftFromOutline(outline, idFactory()) };
}

function idFactory() {
  let counter = 0;
  return () => `imported-${(counter += 1)}`;
}

describe("uvoz Marininih materijala", () => {
  it("svi materijali daju draft koji se može sačuvati", async () => {
    const files = (await readdir(FIXTURES)).filter((file) =>
      file.endsWith(".pdf"),
    );
    expect(files.length).toBeGreaterThanOrEqual(4);

    for (const file of files) {
      const { draft } = await importPdf(file);

      expect(draft.title, file).toBeTruthy();
      expect(draft.blocks.length, file).toBeGreaterThan(0);
      // Draft sme biti nepotpun, ali ne sme biti strukturno neispravan.
      expect(validateContentDocument(draft.blocks, "draft").valid, file).toBe(
        true,
      );
    }
  }, 60_000);

  it("Estetika lica zadržava naslov, podnaslov i sve sekcije", async () => {
    const { outline, draft } = await importPdf("estetika_lica.pdf");

    expect(draft.title).toBe("ESTETIKA LICA");
    expect(draft.hero.subtitle).toBe(
      "Anatomija, proporcije, prirodnost i granica prenaglašenosti",
    );
    // Dokument ima trinaest numerisanih sekcija.
    expect(summarizeOutline(outline).sections).toBe(13);
  }, 60_000);

  it("prepoznaje nabrajanja iako metak ne postoji u tekstu", async () => {
    const { outline, draft } = await importPdf("estetika_lica.pdf");

    expect(summarizeOutline(outline).lists).toBeGreaterThan(3);

    const anatomy = draft.blocks.find(
      (block) => block.type === "ArticleBlock" && block.title.startsWith("Anatomija"),
    );
    expect(anatomy).toBeDefined();
    if (anatomy?.type !== "ArticleBlock") throw new Error("očekivan članak");
    expect(anatomy.items).toContain("koštana struktura");
    expect(anatomy.items).toContain("jagodične kosti");
  }, 60_000);

  it("stručna ograda postaje izdvojena napomena, ne običan pasus", async () => {
    const { draft } = await importPdf("estetika_lica.pdf");
    const callout = draft.blocks.find((block) => block.type === "CalloutBlock");

    expect(callout).toBeDefined();
    if (callout?.type !== "CalloutBlock") throw new Error("očekivan callout");
    expect(callout.title).toMatch(/STRU[ČC]NA OGRADA/i);
    expect(callout.content).toMatch(/nije medicinski savet/i);
  }, 60_000);

  it("prelomljeni pasusi se spajaju u rečenice, ne u redove", async () => {
    const { draft } = await importPdf("estetika_lica.pdf");
    const intro = draft.blocks[0];

    if (intro?.type !== "ArticleBlock") throw new Error("očekivan članak");
    // U PDF-u je ovo prelomljeno na dva reda.
    expect(intro.paragraphs[0]).toContain("rezultat kod svake osobe");
  }, 60_000);

  it("materijal bez ograde i sa dvorednim naslovom takođe prolazi", async () => {
    // Dokumenti nisu jednoobrazni; uvoz ne sme da zavisi od jednog obrasca.
    const { draft } = await importPdf("SPF_FOTOPROTEKCIJA.pdf");

    expect(draft.title).toContain("SPF");
    expect(draft.blocks.length).toBeGreaterThan(0);
  }, 60_000);
});
