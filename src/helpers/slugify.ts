const TRANSLITERATION_MAP: Record<string, string> = {
  // Serbian Latin
  š: "s", Š: "s",
  đ: "dj", Đ: "dj",
  ž: "z", Ž: "z",
  ć: "c", Ć: "c",
  č: "c", Č: "c",
  // Serbian/Bosnian/Croatian extras
  dž: "dz", Dž: "dz", DŽ: "dz",
  lj: "lj", nj: "nj",

  // Serbian Cyrillic
  А: "a", а: "a",
  Б: "b", б: "b",
  В: "v", в: "v",
  Г: "g", г: "g",
  Д: "d", д: "d",
  Ђ: "dj", ђ: "dj",
  Е: "e", е: "e",
  Ж: "z", ж: "z",
  З: "z", з: "z",
  И: "i", и: "i",
  Ј: "j", ј: "j",
  К: "k", к: "k",
  Л: "l", л: "l",
  Љ: "lj", љ: "lj",
  М: "m", м: "m",
  Н: "n", н: "n",
  Њ: "nj", њ: "nj",
  О: "o", о: "o",
  П: "p", п: "p",
  Р: "r", р: "r",
  С: "s", с: "s",
  Т: "t", т: "t",
  Ћ: "c", ћ: "c",
  У: "u", у: "u",
  Ф: "f", ф: "f",
  Х: "h", х: "h",
  Ц: "c", ц: "c",
  Ч: "c", ч: "c",
  Џ: "dz", џ: "dz",
  Ш: "s", ш: "s",
};

/**
 * Converts a string to a URL-safe ASCII slug.
 * Transliterates Serbian Latin and Cyrillic characters to ASCII equivalents.
 */
export function slugify(input: string): string {
  // Replace multi-char sequences first (dž, lj, nj etc.)
  let result = input;
  for (const [from, to] of Object.entries(TRANSLITERATION_MAP)) {
    result = result.split(from).join(to);
  }

  return result
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove remaining non-ASCII chars
    .replace(/\s+/g, "-")          // spaces → dashes
    .replace(/-{2,}/g, "-")        // collapse multiple dashes
    .replace(/^-+|-+$/g, "");      // trim leading/trailing dashes
}
