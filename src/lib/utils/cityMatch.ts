/**
 * Diacritic-insensitive city matching for marketplace queries.
 *
 * SalonProfile.city may be stored with or without Serbian diacritics
 * ("Kruševac" vs "Krusevac"), and the incoming query may differ. This builds a
 * case- and diacritic-insensitive RegExp so both forms match either way.
 */

// Each base latin letter expands to a character class covering its Serbian
// diacritic variants (both cases).
const VARIANTS: Record<string, string> = {
  c: "cčćCČĆ",
  s: "sšSŠ",
  z: "zžZŽ",
  d: "dđDĐ",
};

function escapeRegexChar(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Maps a possibly-diacritic char to its base latin letter. */
function baseLetter(ch: string): string {
  const lower = ch.toLowerCase();
  if ("čć".includes(lower)) return "c";
  if (lower === "š") return "s";
  if (lower === "ž") return "z";
  if (lower === "đ") return "d";
  return lower;
}

export function buildCityRegex(city: string): RegExp {
  const normalized = city.trim().replace(/-/g, " ");
  const pattern = Array.from(normalized)
    .map((ch) => {
      const base = baseLetter(ch);
      const variants = VARIANTS[base];
      return variants ? `[${variants}]` : escapeRegexChar(ch);
    })
    .join("");
  return new RegExp(pattern, "i");
}
