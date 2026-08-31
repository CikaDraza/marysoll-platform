import { describe, expect, it } from "vitest";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { outlineFromHtml } from "./fromHtml";
import { outlineFromLines } from "./fromLines";
import { draftFromOutline, summarizeOutline } from "./toBlocks";

let counter = 0;
const ids = () => `imported-${(counter += 1)}`;

describe("mapiranje strukture u blokove", () => {
  it("sekcija postaje jedan članak sa pasusima i nabrajanjem", () => {
    const draft = draftFromOutline(
      {
        title: "Estetika lica",
        subtitle: "Anatomija i proporcije",
        nodes: [
          { kind: "heading", text: "Anatomija" },
          { kind: "paragraph", text: "Na izgled utiču:" },
          { kind: "list", items: ["koštana struktura", "jagodične kosti"] },
        ],
      },
      ids,
    );

    expect(draft.blocks).toHaveLength(1);
    const block = draft.blocks[0];
    if (block.type !== "ArticleBlock") throw new Error("očekivan članak");

    expect(block.title).toBe("Anatomija");
    expect(block.items).toEqual(["koštana struktura", "jagodične kosti"]);
  });

  it("naslov i podnaslov ne postaju blok nego naslovna sekcija", () => {
    // Jedan izvor istine: hero blok u telu bi bio druga naslovna sekcija.
    const draft = draftFromOutline(
      {
        title: "Estetika lica",
        subtitle: "Anatomija i proporcije",
        nodes: [{ kind: "heading", text: "Uvod" }, { kind: "paragraph", text: "Tekst." }],
      },
      ids,
    );

    expect(draft.title).toBe("Estetika lica");
    expect(draft.hero.subtitle).toBe("Anatomija i proporcije");
    expect(draft.blocks.map((block) => block.type)).not.toContain("HeroBlock");
  });

  it("tekst pre prve sekcije ne propada", () => {
    const draft = draftFromOutline(
      { title: "Naslov", nodes: [{ kind: "paragraph", text: "Prvi pasus." }] },
      ids,
    );

    const block = draft.blocks[0];
    if (block.type !== "ArticleBlock") throw new Error("očekivan članak");
    expect(block.paragraphs).toEqual(["Prvi pasus."]);
  });

  it("prazna sekcija se ne pretvara u prazan blok", () => {
    const draft = draftFromOutline(
      { title: "Naslov", nodes: [{ kind: "heading", text: "Bez teksta" }] },
      ids,
    );

    expect(draft.blocks).toHaveLength(0);
  });

  it("napomena postaje izdvojen blok, ne pasus", () => {
    const draft = draftFromOutline(
      {
        title: "Naslov",
        nodes: [
          { kind: "callout", title: "STRUČNA OGRADA", paragraphs: ["Nije savet.", "Drugi red."] },
        ],
      },
      ids,
    );

    const block = draft.blocks[0];
    if (block.type !== "CalloutBlock") throw new Error("očekivana napomena");
    expect(block.content).toBe("Nije savet.\nDrugi red.");
  });

  it("rezultat je uvek draft koji se može sačuvati", () => {
    const outline = outlineFromLines(
      ["Naslov", "Podnaslov", "1. Uvod", "Tekst koji nije završen"].join("\n"),
    );

    expect(validateContentDocument(draftFromOutline(outline, ids).blocks, "draft").valid).toBe(
      true,
    );
  });
});

describe("čitanje PDF teksta", () => {
  const lines = [
    "NASLOV DOKUMENTA",
    "Podnaslov dokumenta",
    "Edukativni materijal",
    "1. Uvod",
    "Prva rečenica je prelomljena preko dva",
    "reda i mora se spojiti.",
    "2. Nabrajanje",
    "Na izgled utiču:",
    "prva stavka,",
    "druga stavka,",
    "poslednja stavka.",
    "Rečenica posle nabrajanja.",
  ].join("\n");

  it("spaja prelomljen pasus u jednu rečenicu", () => {
    const outline = outlineFromLines(lines);
    const paragraph = outline.nodes.find((node) => node.kind === "paragraph");

    expect(paragraph).toMatchObject({
      text: "Prva rečenica je prelomljena preko dva reda i mora se spojiti.",
    });
  });

  it("prepoznaje nabrajanje po najavi dve tačke, jer metka nema u tekstu", () => {
    const outline = outlineFromLines(lines);
    const list = outline.nodes.find((node) => node.kind === "list");

    expect(list).toMatchObject({
      items: ["prva stavka", "druga stavka", "poslednja stavka"],
    });
  });

  it("oznake sa naslovne strane ne postaju tekst", () => {
    const outline = outlineFromLines(lines);

    expect(JSON.stringify(outline.nodes)).not.toContain("Edukativni materijal");
    expect(outline.subtitle).toBe("Podnaslov dokumenta");
  });

  it("broji šta je prepoznato, da vlasnica zna šta da proveri", () => {
    expect(summarizeOutline(outlineFromLines(lines))).toEqual({
      sections: 2,
      lists: 1,
      callouts: 0,
    });
  });
});

describe("čitanje DOCX strukture", () => {
  const html = [
    "<h1>Naslov</h1>",
    "<p>Podnaslov</p>",
    "<h2>Prva sekcija</h2>",
    "<p>Pasus.</p>",
    "<ul><li>prva</li><li>druga</li></ul>",
  ].join("");

  it("čita prave naslove i liste, bez pogađanja", () => {
    const outline = outlineFromHtml(html);

    expect(outline.title).toBe("Naslov");
    expect(outline.subtitle).toBe("Podnaslov");
    expect(outline.nodes).toEqual([
      { kind: "heading", text: "Prva sekcija" },
      { kind: "paragraph", text: "Pasus." },
      { kind: "list", items: ["prva", "druga"] },
    ]);
  });
});
