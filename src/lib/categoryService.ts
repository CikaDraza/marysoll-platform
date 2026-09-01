import { connectToDB } from "@/lib/db/mongodb";
import { Category, ICategoryDoc } from "@/models/Category";
import { CATEGORY_MAP } from "@/lib/categoryMap";

export { CATEGORY_MAP };

// ─── Cache ────────────────────────────────────────────────────────────────────

export interface CategoryData {
  key: string;
  label: string;
  synonyms: string[];
  subcategories: { key: string; label: string; synonyms: string[] }[];
  isActive: boolean;
  requiresIntake: boolean;
  popularityScore: number;
}

let cache: CategoryData[] | null = null;
let lastFetch = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Transform DB docs → CategoryData ────────────────────────────────────────

function transformDocs(docs: ICategoryDoc[]): CategoryData[] {
  return docs.map((d) => ({
    key: d.key,
    label: d.label,
    synonyms: d.synonyms ?? [],
    subcategories: (d.subcategories ?? []).map((s) => ({
      key: s.key,
      label: s.label,
      synonyms: s.synonyms ?? [],
    })),
    isActive: d.isActive,
    // Zatečeni dokumenti nemaju ovo polje (seed se pokreće samo na praznu
    // kolekciju), pa se pada na platformski podrazumevani iz `CATEGORY_MAP` —
    // bez migracije. Superadmin koji ga izričito postavi na false dobija false.
    requiresIntake:
      d.requiresIntake ?? CATEGORY_MAP[d.key]?.requiresIntake ?? false,
    popularityScore: d.popularityScore ?? 0,
  }));
}

// ─── Seed DB from CATEGORY_MAP ────────────────────────────────────────────────

async function seedFromStaticMap(): Promise<CategoryData[]> {
  const docs = Object.entries(CATEGORY_MAP).map(([key, cat]) => ({
    key,
    label: cat.label,
    synonyms: cat.synonyms,
    subcategories: Object.entries(cat.subcategories).map(([subKey, sub]) => ({
      key: subKey,
      label: sub.label,
      synonyms: sub.synonyms,
    })),
    isActive: true,
    requiresIntake: Boolean(cat.requiresIntake),
    popularityScore: 0,
  }));

  await Category.insertMany(docs, { ordered: false }).catch(() => {
    // ignore duplicate key errors in case of race conditions
  });

  // Re-fetch freshly inserted docs
  const inserted = await Category.find({ isActive: true })
    .sort({ popularityScore: -1, label: 1 })
    .lean() as unknown as ICategoryDoc[];

  return transformDocs(inserted);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryData[]> {
  const now = Date.now();
  if (cache && now - lastFetch < TTL_MS) return cache;

  try {
    await connectToDB();

    const docs = await Category.find({ isActive: true })
      .sort({ popularityScore: -1, label: 1 })
      .lean() as unknown as ICategoryDoc[];

    if (docs.length === 0) {
      // DB empty → seed from static map
      cache = await seedFromStaticMap();
    } else {
      cache = transformDocs(docs);
    }

    lastFetch = now;
    return cache;
  } catch {
    // DB unavailable → return static fallback without caching
    return Object.entries(CATEGORY_MAP).map(([key, cat]) => ({
      key,
      label: cat.label,
      synonyms: cat.synonyms,
      subcategories: Object.entries(cat.subcategories).map(([subKey, sub]) => ({
        key: subKey,
        label: sub.label,
        synonyms: sub.synonyms,
      })),
      isActive: true,
      requiresIntake: Boolean(cat.requiresIntake),
      popularityScore: 0,
    }));
  }
}


export function invalidateCategoryCache() {
  cache = null;
  lastFetch = 0;
}
