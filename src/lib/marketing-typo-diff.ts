import type { MarketingLandingStructure } from "@/types/marketing-landing";

export interface TypoCorrection {
  before: string;
  after: string;
}

// Skip non-text leaves (urls, anchors, paths) so they never show as "words".
function isSkippable(value: string): boolean {
  return /^(https?:\/\/|\/|#|mailto:)/.test(value.trim());
}

// Only keep tokens that actually contain a letter (drops emoji, numbers, prices).
function hasLetter(value: string): boolean {
  return /\p{L}/u.test(value);
}

function diffWords(before: string, after: string, out: TypoCorrection[]): void {
  const b = before.trim().split(/\s+/).filter(Boolean);
  const a = after.trim().split(/\s+/).filter(Boolean);

  if (b.length === a.length) {
    for (let i = 0; i < a.length; i++) {
      if (b[i] !== a[i] && hasLetter(a[i]) && !isSkippable(a[i])) {
        out.push({ before: b[i], after: a[i] });
      }
    }
    return;
  }

  // Different word count — show tokens present only in the corrected text.
  const beforeSet = new Set(b);
  for (const word of a) {
    if (!beforeSet.has(word) && hasLetter(word) && !isSkippable(word)) {
      out.push({ before: "", after: word });
    }
  }
}

function walk(before: unknown, after: unknown, out: TypoCorrection[]): void {
  if (typeof before === "string" && typeof after === "string") {
    if (before !== after && !isSkippable(before) && !isSkippable(after)) {
      diffWords(before, after, out);
    }
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const n = Math.min(before.length, after.length);
    for (let i = 0; i < n; i++) walk(before[i], after[i], out);
    return;
  }
  if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object"
  ) {
    const afterObj = after as Record<string, unknown>;
    for (const key of Object.keys(before as Record<string, unknown>)) {
      if (afterObj[key] !== undefined) {
        walk((before as Record<string, unknown>)[key], afterObj[key], out);
      }
    }
  }
}

/**
 * Word-level diff between the original and typo-corrected landing structures.
 * Returns the list of corrected words (before → after), de-duplicated.
 */
export function computeTypoCorrections(
  before: MarketingLandingStructure,
  after: Partial<MarketingLandingStructure>,
): TypoCorrection[] {
  const raw: TypoCorrection[] = [];
  walk(before, after, raw);

  const seen = new Set<string>();
  const unique: TypoCorrection[] = [];
  for (const c of raw) {
    const key = `${c.before}→${c.after}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }
  return unique;
}
