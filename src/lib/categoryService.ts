import { connectToDB } from "@/lib/db/mongodb";
import { Category, ICategoryDoc } from "@/models/Category";

// ─── Static seed / fallback ───────────────────────────────────────────────────
// Used when DB is empty (first deploy) or unreachable.
// Structure: { [key]: { label, synonyms, subcategories: { [subKey]: { label, synonyms[] } } } }

export const CATEGORY_MAP: Record<
  string,
  {
    label: string;
    synonyms: string[];
    subcategories: Record<string, { label: string; synonyms: string[] }>;
  }
> = {
  nails: {
    label: "Nokti",
    synonyms: ["nokti", "manikir", "pedikir", "nails"],
    subcategories: {
      manicure: { label: "Manikir", synonyms: ["manikir", "klasični manikir"] },
      gel: { label: "Gel lak", synonyms: ["gel lak", "gel"] },
      extension: { label: "Nadogradnja", synonyms: ["izlivanje", "nadogradnja", "tipse"] },
      pedicure: { label: "Pedikir", synonyms: ["pedikir"] },
    },
  },
  massage: {
    label: "Masaža",
    synonyms: ["masaža", "masaza", "massage"],
    subcategories: {
      relax: { label: "Relaks masaža", synonyms: ["relax", "opuštajuća", "klasična"] },
      sport: { label: "Sportska masaža", synonyms: ["sportska"] },
      anti: { label: "Anticelulitna", synonyms: ["anticelulit", "anticelulitna"] },
      hot_stone: { label: "Masaža vrućim kamenjem", synonyms: ["hot stone", "kamenje"] },
    },
  },
  hair: {
    label: "Kosa",
    synonyms: ["frizer", "šišanje", "kosa", "hair", "frizura"],
    subcategories: {
      cut: { label: "Šišanje", synonyms: ["šišanje", "sisanje"] },
      styling: { label: "Feniranje", synonyms: ["feniranje", "blow dry"] },
      color: { label: "Farbanje", synonyms: ["farbanje", "bojenje", "pramenovi", "balayage"] },
      treatment: { label: "Tretman kose", synonyms: ["keratin", "maska"] },
    },
  },
  facial: {
    label: "Lice",
    synonyms: ["lice", "kozmetika", "facial"],
    subcategories: {
      cleaning: { label: "Čišćenje lica", synonyms: ["čišćenje", "dubinsko čišćenje"] },
      treatment: { label: "Tretman lica", synonyms: ["tretman", "hydrafacial"] },
      peeling: { label: "Peeling", synonyms: ["piling", "peeling"] },
    },
  },
  makeup: {
    label: "Šminka",
    synonyms: ["sminka", "šminka", "makeup", "make-up"],
    subcategories: {
      daily: { label: "Dnevna šminka", synonyms: ["dnevna"] },
      event: { label: "Svečana šminka", synonyms: ["svečana", "prom", "matatura"] },
      bridal: { label: "Venčana šminka", synonyms: ["venčana", "bridal"] },
    },
  },
  waxing: {
    label: "Depilacija",
    synonyms: ["depilacija", "vosak", "waxing", "laser"],
    subcategories: {
      wax: { label: "Voštana depilacija", synonyms: ["vosak", "wax"] },
      laser: { label: "Laser depilacija", synonyms: ["laser"] },
      sugar: { label: "Šećerna pasta", synonyms: ["šećerna", "sugaring"] },
    },
  },
  eyelashes: {
    label: "Trepavice",
    synonyms: ["trepavice", "lashes", "ekstenzije"],
    subcategories: {
      classic: { label: "Klasične trepavice", synonyms: ["klasične", "1:1"] },
      volume: { label: "Volume trepavice", synonyms: ["volume", "russian volume"] },
      lifting: { label: "Lifting trepavica", synonyms: ["lifting", "lash lift"] },
    },
  },
  other: {
    label: "Ostalo",
    synonyms: [],
    subcategories: {},
  },
};

// ─── Cache ────────────────────────────────────────────────────────────────────

export interface CategoryData {
  key: string;
  label: string;
  synonyms: string[];
  subcategories: { key: string; label: string; synonyms: string[] }[];
  isActive: boolean;
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
      popularityScore: 0,
    }));
  }
}


export function invalidateCategoryCache() {
  cache = null;
  lastFetch = 0;
}
