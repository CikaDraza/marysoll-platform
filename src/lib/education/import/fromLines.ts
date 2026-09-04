import { cleanText, type DocumentOutline, type OutlineNode } from "./outline";

/**
 * Rekonstrukcija strukture iz čistog teksta (PDF).
 *
 * PDF ne nosi strukturu: naslov, pasus i stavka nabrajanja stižu kao iste
 * linije, a metak je crtež koji se u tekstu ne vidi. Zato se ovde čita ono
 * malo signala što ostane:
 *
 *   „3. Naslov"       numerisan naslov sekcije
 *   „TIP KOŽE"        verzalni naslov sekcije — drugi njen obrazac
 *   „…nešto:"         najava nabrajanja — ono što sledi su stavke
 *   red bez tačke     nastavak prelomljenog pasusa
 *   „STRUČNA OGRADA"  poseban blok do kraja dokumenta
 *
 * Rezultat je NAMERNO draft: pogađanje sme da promaši, pa vlasnica pregleda i
 * ispravlja. Iz istog razloga uvoz nikada ne objavljuje.
 */
const NUMBERED_HEADING = /^\d+\.\s+\S/;
/** Verzalni naslov je kratak; ceo pasus verzalom nije naslov. */
const MAX_HEADING_LENGTH = 60;
/** Metak bez teksta ostane kao siroče kada je stavka nacrtana, ne napisana. */
const ORPHAN_MARKER = /^[•▪◦·\-–—*]+$/;
const CALLOUT_TITLE = /^(STRU[ČC]NA OGRADA|VAŽNO|NAPOMENA)\s*$/i;
/** Stavke nabrajanja se prepoznaju po najavi dve tačke u prethodnom redu. */
const LIST_INTRO = /:\s*$/;
const SENTENCE_END = /[.!?:"“”)]\s*$/;

/** Zaglavlje/podnožje stranice se ponavlja i nije sadržaj. */
function isRepeatedChrome(line: string, counts: Map<string, number>): boolean {
  return (counts.get(line) ?? 0) > 2;
}

/** Naslov ume da bude prelomljen na dva reda, i tada je pisan verzalom. */
function isTitleCase(line: string): boolean {
  const letters = line.replace(/[^\p{L}]/gu, "");
  if (letters.length < 3) return false;
  return letters === letters.toLocaleUpperCase("sr");
}

/**
 * Naslovna strana nosi i oznake koje nisu sadržaj — „Edukativni materijal iz
 * ugla kozmetičarke", „Autor: …". Kratke su, bez tačke, i stoje pre prve
 * sekcije. Vrsta i autor se ionako biraju u CMS-u, pa se ovde odbacuju.
 */
function isFrontMatterLabel(line: string): boolean {
  return line.length <= 80 && !/[.!?]\s*$/.test(line);
}

/**
 * Naslov sekcije — dva obrasca koja se javljaju u stvarnim materijalima:
 * numerisan („3. Uvod") i verzalni („TIP KOŽE").
 */
function isHeadingLine(line: string): boolean {
  if (NUMBERED_HEADING.test(line)) return true;
  return isTitleCase(line) && line.length <= MAX_HEADING_LENGTH;
}

export function outlineFromLines(raw: string): DocumentOutline {
  const lines = raw
    .split("\n")
    .map(cleanText)
    .filter(
      (line) =>
        line.length > 0 && !/^\d+$/.test(line) && !ORPHAN_MARKER.test(line),
    );

  const counts = new Map<string, number>();
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1);

  const body = lines.filter((line) => !isRepeatedChrome(line, counts));
  const nodes: OutlineNode[] = [];

  // Naslov ume da bude prelomljen preko dva reda verzalom.
  let cursor = 0;
  const titleLines: string[] = [];
  while (
    cursor < body.length &&
    (cursor === 0 || isTitleCase(body[cursor])) &&
    !NUMBERED_HEADING.test(body[cursor])
  ) {
    titleLines.push(body[cursor]);
    cursor += 1;
    if (titleLines.length >= 3) break;
  }
  const title = titleLines.join(" ");

  const subtitle =
    body[cursor] &&
    !isHeadingLine(body[cursor]) &&
    !CALLOUT_TITLE.test(body[cursor])
      ? body[cursor]
      : undefined;
  if (subtitle) cursor += 1;

  // Ostatak naslovne strane pre prve sekcije su oznake, ne tekst.
  // Traži se TEK posle naslova: i sam naslov je verzalan, pa bi inače on bio
  // „prva sekcija" i oznake sa naslovne strane ne bi bile odbačene.
  const firstHeading = body.findIndex(
    (line, position) => position >= cursor && isHeadingLine(line),
  );
  while (
    firstHeading > cursor &&
    cursor < firstHeading &&
    isFrontMatterLabel(body[cursor])
  ) {
    cursor += 1;
  }

  let index = cursor;
  let expectingList = false;

  const pushParagraph = (text: string) => {
    const previous = nodes[nodes.length - 1];
    // Prelomljen pasus: prethodni red nije završen, pa se nastavlja.
    if (previous?.kind === "paragraph" && !SENTENCE_END.test(previous.text)) {
      previous.text = `${previous.text} ${text}`;
      return;
    }
    nodes.push({ kind: "paragraph", text });
  };

  while (index < body.length) {
    const line = body[index];

    if (CALLOUT_TITLE.test(line)) {
      nodes.push({
        kind: "callout",
        title: line,
        paragraphs: body.slice(index + 1),
      });
      break;
    }

    if (isHeadingLine(line)) {
      nodes.push({ kind: "heading", text: line.replace(/^\d+\.\s+/, "") });
      expectingList = false;
      index += 1;
      continue;
    }

    if (expectingList && !SENTENCE_END.test(line)) {
      const previous = nodes[nodes.length - 1];
      const item = line.replace(/[,;]\s*$/, "");
      if (previous?.kind === "list") previous.items.push(item);
      else nodes.push({ kind: "list", items: [item] });
      index += 1;
      continue;
    }

    // Poslednja stavka nabrajanja završava tačkom, pa je zatvara.
    if (expectingList && nodes[nodes.length - 1]?.kind === "list") {
      const previous = nodes[nodes.length - 1] as { items: string[] };
      previous.items.push(line.replace(/\.\s*$/, ""));
      expectingList = false;
      index += 1;
      continue;
    }

    pushParagraph(line);
    expectingList = LIST_INTRO.test(line);
    index += 1;
  }

  return { title, subtitle, nodes };
}
