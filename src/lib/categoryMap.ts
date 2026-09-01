/**
 * categoryMap.ts — statički registar kategorija usluga.
 *
 * Izdvojen iz `categoryService` jer taj modul pri importu otvara konekciju na
 * bazu: registar je čist podatak i mora da se čita (i testira) bez nje. Služi
 * kao seed za praznu bazu i kao fallback kad je baza nedostupna.
 */
// Used when DB is empty (first deploy) or unreachable.
// Structure: { [key]: { label, synonyms, subcategories: { [subKey]: { label, synonyms[] } } } }

export const CATEGORY_MAP: Record<
  string,
  {
    label: string;
    synonyms: string[];
    /** Usluge iz kategorije traže zahtev klijentkinje (slika/link/opis). */
    requiresIntake?: boolean;
    subcategories: Record<string, { label: string; synonyms: string[] }>;
  }
> = {
  nails: {
    label: "Nokti",
    synonyms: ["nokti", "manikir", "pedikir", "nails"],
    // Cena noktiju zavisi od dizajna, pa je referenca deo zahteva, ne dodatak.
    requiresIntake: true,
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

