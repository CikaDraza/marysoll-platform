/**
 * Međukorak između pročitanog dokumenta i naših blokova.
 *
 * Postoji zato što se formati razlikuju po tome koliko strukture uopšte nose:
 * DOCX daje prave naslove i liste, dok PDF daje samo linije teksta — metak
 * nabrajanja je u njemu crtež, ne znak. Zbog toga se čitanje formata i
 * mapiranje u blokove drže odvojeno: mapiranje je jedno i testirano, a čitač se
 * menja po formatu.
 */
export type OutlineNode =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; title: string; paragraphs: string[] };

export interface DocumentOutline {
  /** Naslov dokumenta — postaje naslov sadržaja, ne blok. */
  title?: string;
  /** Podnaslov — postaje podnaslov naslovne sekcije. */
  subtitle?: string;
  nodes: OutlineNode[];
}

/** Prazan tekst nigde ne treba; ovo je jedina tačka na kojoj se to čisti. */
export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function isBlankOutline(outline: DocumentOutline): boolean {
  return !outline.title && outline.nodes.length === 0;
}
