import { cleanText, type DocumentOutline, type OutlineNode } from "./outline";

/**
 * DOCX put — verno čitanje.
 *
 * Za razliku od PDF-a, ovde struktura stvarno postoji: `h1`–`h3` su naslovi, a
 * `ul`/`ol` su liste. Zato se ništa ne pogađa; jedino se prvi naslov uzima kao
 * naslov dokumenta, jer to je i njegova uloga.
 */
/**
 * `ul`/`ol` se namerno NE hvataju: poklapanje celog spiska pojelo bi svoje
 * `li` elemente, pa bi nabrajanja nestala. Stavke se hvataju direktno.
 */
const TAG = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;

function stripTags(html: string): string {
  return cleanText(html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " "));
}

export function outlineFromHtml(html: string): DocumentOutline {
  const nodes: OutlineNode[] = [];
  let title: string | undefined;
  let subtitle: string | undefined;

  for (const match of html.matchAll(TAG)) {
    const tag = match[1].toLowerCase();
    const text = stripTags(match[2]);
    if (!text) continue;

    if (/^h[1-6]$/.test(tag)) {
      if (!title) {
        title = text;
        continue;
      }
      nodes.push({ kind: "heading", text });
      continue;
    }

    if (tag === "li") {
      const previous = nodes[nodes.length - 1];
      if (previous?.kind === "list") previous.items.push(text);
      else nodes.push({ kind: "list", items: [text] });
      continue;
    }

    // Prvi pasus pre ijedne sekcije služi kao podnaslov.
    if (title && !subtitle && nodes.length === 0) {
      subtitle = text;
      continue;
    }
    nodes.push({ kind: "paragraph", text });
  }

  return { title, subtitle, nodes };
}
