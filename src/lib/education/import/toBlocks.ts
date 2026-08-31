import { createContentBlockId } from "@/lib/content/editor/blockFactories";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type { EducationHero } from "@/lib/education/content-document";
import type { DocumentOutline, OutlineNode } from "./outline";

export interface ImportedDraft {
  title: string;
  hero: EducationHero;
  blocks: ContentBlock[];
}

/**
 * Struktura dokumenta → naši blokovi.
 *
 * Naslov i podnaslov NE postaju blok: oni su naslov sadržaja i naslovna
 * sekcija, jedan izvor istine koji hrani i karticu i zaglavlje strane.
 *
 * Sekcija dokumenta postaje jedan `ArticleBlock` — naslov, pasusi i, ako ih
 * ima, nabrajanje. To je isti oblik koji njeni materijali stvarno imaju, pa
 * uvoz ne pravi trideset sitnih blokova nego onoliko koliko sekcija ima.
 *
 * Stručna ograda postaje `CalloutBlock`, jer to i jeste — izdvojena napomena
 * koja razdvaja kozmetičku edukaciju od medicinske procene.
 */
export function draftFromOutline(
  outline: DocumentOutline,
  idFactory: () => string = createContentBlockId,
): ImportedDraft {
  const blocks: ContentBlock[] = [];

  let current: {
    title: string;
    paragraphs: string[];
    items: string[];
  } | null = null;

  const flush = () => {
    if (!current) return;
    // Sekcija bez ijedne reči ne postaje blok.
    if (current.paragraphs.length === 0 && current.items.length === 0) {
      current = null;
      return;
    }

    blocks.push({
      id: idFactory(),
      type: "ArticleBlock",
      priority: blocks.length + 1,
      title: current.title,
      paragraphs: current.paragraphs,
      ...(current.items.length > 0 ? { items: current.items } : {}),
    } as ContentBlock);
    current = null;
  };

  const openSection = (title: string) => {
    flush();
    current = { title, paragraphs: [], items: [] };
  };

  for (const node of outline.nodes) {
    switch (node.kind) {
      case "heading":
        openSection(node.text);
        break;

      case "paragraph":
        // Tekst pre prve sekcije i dalje je sadržaj — dobija svoj uvodni blok.
        if (!current) openSection("Uvod");
        current!.paragraphs.push(node.text);
        break;

      case "list":
        if (!current) openSection("Uvod");
        current!.items.push(...node.items);
        break;

      case "callout":
        flush();
        blocks.push({
          id: idFactory(),
          type: "CalloutBlock",
          priority: blocks.length + 1,
          variant: "important",
          title: node.title,
          content: node.paragraphs.join("\n"),
        } as ContentBlock);
        break;
    }
  }

  flush();

  return {
    title: outline.title ?? "",
    hero: outline.subtitle ? { subtitle: outline.subtitle } : {},
    blocks,
  };
}

/** Koliko je uvoz stvarno prepoznao — prikazuje se vlasnici posle uvoza. */
export function summarizeOutline(outline: DocumentOutline): {
  sections: number;
  lists: number;
  callouts: number;
} {
  const count = (kind: OutlineNode["kind"]) =>
    outline.nodes.filter((node) => node.kind === kind).length;

  return {
    sections: count("heading"),
    lists: count("list"),
    callouts: count("callout"),
  };
}
