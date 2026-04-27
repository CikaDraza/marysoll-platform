import { getCategoryMap } from "@/lib/categoryService";

export interface MatchResult {
  canonicalCategory: string;
  canonicalKey: string;
  subcategoryKey?: string;
}

export async function matchCategory(input: string): Promise<MatchResult> {
  const normalized = input.toLowerCase().trim();
  const categoryMap = await getCategoryMap();

  for (const [key, cat] of Object.entries(categoryMap)) {
    // Match by key or label
    if (key === normalized || cat.label.toLowerCase() === normalized) {
      return { canonicalCategory: cat.label, canonicalKey: key };
    }

    // Match by top-level synonyms
    if (cat.synonyms.some((s) => s.toLowerCase() === normalized)) {
      return { canonicalCategory: cat.label, canonicalKey: key };
    }

    // Match by subcategory key/label/synonyms
    for (const sub of cat.subcategories) {
      if (
        sub.key === normalized ||
        sub.label.toLowerCase() === normalized ||
        sub.synonyms.some((s) => s.toLowerCase() === normalized)
      ) {
        return {
          canonicalCategory: cat.label,
          canonicalKey: key,
          subcategoryKey: sub.key,
        };
      }
    }
  }

  // Partial match fallback
  for (const [key, cat] of Object.entries(categoryMap)) {
    if (
      cat.label.toLowerCase().includes(normalized) ||
      normalized.includes(cat.label.toLowerCase())
    ) {
      return { canonicalCategory: cat.label, canonicalKey: key };
    }
    if (cat.synonyms.some((s) => normalized.includes(s.toLowerCase()))) {
      return { canonicalCategory: cat.label, canonicalKey: key };
    }
  }

  return { canonicalCategory: "Ostalo", canonicalKey: "other" };
}
