/**
 * Privremeni Ash Studio demo ugovor za temu 10.
 *
 * Domena još nema održavanu vezu usluga ↔ majstor ↔ cena, zato ovaj sloj
 * prepoznaje postojeće usluge po nazivu i služi isključivo za Theme-10 prikaz
 * cenovnika i filtriranje izbora u njegovom booking modalu. Upis termina i
 * katalog usluga i dalje ostaju jedini izvor istine u postojećem booking domenu.
 */
import type { IService } from "@/types";

export const THEME10_DEMO_MASTERS = [
  { id: "evgenija", label: "Evgenija", spec: "Pedikir, gel tehnike, dizajn folije" },
  { id: "anna", label: "Anna", spec: "Manikir, izlivanje i art dizajn" },
  { id: "aleksandra", label: "Aleksandra", spec: "Manikir i pedikir sa gel lakom" },
] as const;

export type Theme10DemoMaster = (typeof THEME10_DEMO_MASTERS)[number];

/** Handoff raspored zaglavlja za široki cenovnik. */
export const THEME10_DEMO_DESKTOP_MASTERS = [
  THEME10_DEMO_MASTERS[1],
  THEME10_DEMO_MASTERS[0],
  THEME10_DEMO_MASTERS[2],
] as const;

/** Raspored izbora majstora iz booking handoffa. */
export const THEME10_DEMO_BOOKING_MASTERS = [
  THEME10_DEMO_MASTERS[1],
  THEME10_DEMO_MASTERS[2],
  THEME10_DEMO_MASTERS[0],
] as const;

type DemoMasterId = (typeof THEME10_DEMO_MASTERS)[number]["id"];

type DemoServiceRule = {
  /** Fraze su normalizovani nazivi iz handoff cenovnika. */
  names: string[];
  masters: DemoMasterId[];
  prices: Partial<Record<DemoMasterId, string>>;
  /** Dizajn noktiju je red cenovnika, ali nije među osam booking usluga handoffa. */
  bookable?: boolean;
};

export type Theme10DemoPriceRow = {
  category: "Manikir" | "Specijalna usluga" | "Pedikir";
  name: string;
  description?: string;
};

/** Celovit cenovnik iz Ash Studio handoffa, nezavisan od privremenog CMS unosa. */
export const THEME10_DEMO_PRICE_ROWS: Theme10DemoPriceRow[] = [
  { category: "Manikir", name: "Higijenski manikir" },
  {
    category: "Manikir",
    name: "Skidanje + higijenski manikir",
    description: "Skidanje gel laka se ne radi bez obrade noktiju.",
  },
  {
    category: "Manikir",
    name: "Manikir sa gel lakom",
    description: "Uklanjanje zanoktica, jačanje gelom, premazivanje bojom, dizajn (nalepnice, šljokice).",
  },
  {
    category: "Specijalna usluga",
    name: "Izlivanje noktiju",
    description: "Jačanje, premaz, šljokica, nalepnice 2 kom.",
  },
  {
    category: "Specijalna usluga",
    name: "Dizajn noktiju",
    description: "Utrljanje, french, cirkoni, nalepnice.",
  },
  {
    category: "Specijalna usluga",
    name: "Art dizajn",
    description: "Likovi — 2 nokta.",
  },
  {
    category: "Pedikir",
    name: "Higijenski pedikir",
    description: "Tretman stopala i nožnih prstiju. +500 rsd za tretman pukotina, uraslih noktiju i žuljeva.",
  },
  { category: "Pedikir", name: "Higijenski pedikir prstiju" },
  {
    category: "Pedikir",
    name: "Pedikir prstiju sa gel lakom",
    description: "Uklanjanje zanoktica, tretman, nanošenje gel laka.",
  },
  {
    category: "Pedikir",
    name: "Pedikir sa gel lakom",
    description: "Uklanjanje zanoktica, tretman stopala, nanošenje gel laka.",
  },
  {
    category: "Pedikir",
    name: "Pedikir sa dizajn folijama",
    description: "Uklanjanje zanoktica, tretman stopala, nanošenje dizajn folijama.",
  },
];

const DEMO_SERVICE_RULES: DemoServiceRule[] = [
  {
    names: ["higijenski manikir"],
    masters: ["anna", "evgenija", "aleksandra"],
    prices: { anna: "1.500 rsd", evgenija: "1.500 rsd", aleksandra: "1.500 rsd" },
  },
  {
    names: ["skidanje + higijenski manikir", "skidanje higijenski manikir"],
    masters: ["anna", "evgenija", "aleksandra"],
    prices: { anna: "2.000 rsd", evgenija: "2.000 rsd", aleksandra: "2.000 rsd" },
  },
  {
    names: ["manikir sa gel lakom"],
    masters: ["anna", "evgenija", "aleksandra"],
    prices: { anna: "3.000 rsd", evgenija: "3.000 rsd", aleksandra: "3.500 rsd" },
  },
  {
    names: ["izlivanje noktiju"],
    masters: ["anna"],
    prices: { anna: "4.000 rsd" },
  },
  {
    names: ["dizajn noktiju"],
    masters: ["anna", "evgenija", "aleksandra"],
    prices: {
      anna: "200 — 500 rsd",
      evgenija: "200 — 500 rsd",
      aleksandra: "200 — 500 rsd",
    },
    bookable: false,
  },
  {
    names: ["art dizajn", "art design"],
    masters: ["anna"],
    prices: { anna: "1.000 rsd" },
  },
  {
    names: ["higijenski pedikir prstiju"],
    masters: ["evgenija", "aleksandra"],
    prices: { evgenija: "1.500 rsd", aleksandra: "1.500 rsd" },
  },
  {
    names: ["higijenski pedikir"],
    masters: ["evgenija", "aleksandra"],
    prices: { evgenija: "2.500 rsd", aleksandra: "2.500 rsd" },
  },
  {
    names: ["pedikir prstiju sa gel lakom"],
    masters: ["evgenija", "aleksandra"],
    prices: { evgenija: "2.500 rsd", aleksandra: "2.500 rsd" },
  },
  {
    names: ["pedikir sa gel lakom"],
    masters: ["evgenija", "aleksandra"],
    prices: { evgenija: "3.500 rsd", aleksandra: "3.500 rsd" },
  },
  {
    names: ["pedikir sa dizajn folijama", "pedikir sa dizajn folijom"],
    masters: ["evgenija"],
    prices: { evgenija: "4.000 rsd" },
  },
];

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("sr-RS")
    .replace(/\s+/g, " ")
    .trim();
}

function ruleFor(service: Pick<IService, "name">): DemoServiceRule | undefined {
  const name = normalized(service.name);
  return DEMO_SERVICE_RULES.find((rule) =>
    rule.names.some((candidate) => name === candidate || name.startsWith(`${candidate} (`)),
  );
}

function masterIdFromName(name: string): DemoMasterId | undefined {
  const value = normalized(name);
  return THEME10_DEMO_MASTERS.find((master) => normalized(master.label) === value)?.id;
}

/** Poznati Ash Studio majstor vidi samo usluge iz demo handoff matrice. */
export function theme10ServicesForMaster(services: IService[], masterName: string): IService[] {
  const masterId = masterIdFromName(masterName);
  if (!masterId) return services;
  return services.filter((service) => {
    const rule = ruleFor(service);
    return rule?.bookable !== false && rule?.masters.includes(masterId);
  });
}

/** Samo osam usluga koje demo booking handoff zaista podržava. */
export function theme10BookableServices(services: IService[]): IService[] {
  return services.filter((service) => {
    const rule = ruleFor(service);
    return !!rule && rule.bookable !== false;
  });
}

/** Majstori koji po demo matrici mogu da izvode konkretnu booking uslugu. */
export function theme10MastersForService(
  service: Pick<IService, "name">,
): Theme10DemoMaster[] {
  const rule = ruleFor(service);
  if (!rule || rule.bookable === false) return [];
  return THEME10_DEMO_BOOKING_MASTERS.filter((master) => rule.masters.includes(master.id));
}

/** `null` namerno postaje em dash: taj majstor ne radi datu uslugu. */
export function theme10DemoPriceForMaster(
  service: Pick<IService, "name">,
  masterId: string,
): string | null {
  const rule = ruleFor(service);
  if (!rule || !THEME10_DEMO_MASTERS.some((master) => master.id === masterId)) return null;
  return rule.prices[masterId as DemoMasterId] ?? null;
}
