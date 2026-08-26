/**
 * lib/theme9/sectionNormalization.ts — 2B.1 klasifikator
 *
 * Čist modul: bez DB-a, bez React-a, bez I/O. CLI (`scripts/normalize-theme9-
 * section-state.mts`) ga samo poziva nad dokumentima koje sam dovuče, pa se
 * pravilo može testirati bez baze.
 *
 * ZAŠTO POSTOJI
 * 2B.0 je uklonio `default: false` sa sedam theme-9 sekcija, ali uklanjanje
 * default-a iz šeme NE briše već upisane vrednosti iz Mongo-a. Svaki
 * `SalonProfile` sačuvan dok je default postojao i dalje fizički nosi:
 *
 *     { "audiencePaths": { "enabled": false, "paths": [] } }
 *
 * Čim resolver (2B.2) počne da poštuje `false` kao apsolutni veto, taj
 * IMPLICITNI false postaje nerazlučiv od stvarne odluke vlasnice — tačno
 * problem koji 2B.0 postoji da eliminiše.
 *
 * PRAVILO (konzervativno, ne masovni `$unset`)
 *
 *     false + nema meaningful sadržaja  → kandidat za $unset
 *     false + ima meaningful sadržaj    → NE DIRAJ, ide u report
 *     true                              → NE DIRAJ
 *     odsutno                           → NE DIRAJ
 *
 * Sve što nije prvi slučaj ostaje netaknuto. Kad postoji ikakva sumnja,
 * odluka je „ne diraj" — pogrešan `$unset` briše stvarnu korisničku nameru,
 * a propušten kandidat se uvek može očistiti kasnije.
 */

/** Sedam theme-9 sekcija sa kojih je 2B.0 uklonio `default: false`. */
export const THEME9_TRISTATE_SECTIONS = [
  "audiencePaths",
  "topicHub",
  "guidedCareProcess",
  "credentials",
  "featuredEducation",
  "professionalPath",
  "finalCta",
] as const;

export type Theme9TristateSection = (typeof THEME9_TRISTATE_SECTIONS)[number];

export type SectionDecision =
  /** `false` bez autorskog sadržaja — implicitni legacy default, sme `$unset`. */
  | "unset_candidate"
  /** `false` ali sadržaj postoji — moguća stvarna odluka, ide na ručni pregled. */
  | "review_has_content"
  /** `true` — vlasnica izričito traži sekciju. */
  | "keep_enabled"
  /** Nema `enabled` — tri-state je već čist za ovu sekciju. */
  | "already_absent"
  /** Sekcija uopšte ne postoji u dokumentu. */
  | "section_missing";

export interface SectionClassification {
  section: Theme9TristateSection;
  enabled: boolean | undefined;
  meaningfulContent: boolean;
  decision: SectionDecision;
}

/**
 * Ključevi koji nikada nisu autorski sadržaj: Mongo interni i sam `enabled`,
 * koji je nosilac ODLUKE, ne sadržaja.
 */
const NEVER_CONTENT = new Set(["_id", "__v", "enabled"]);

/**
 * Ima li vrednost ikakav autorski sadržaj.
 *
 * Namerno greši u smeru „ima sadržaja": `true` se broji kao sadržaj iako je
 * verovatno toggle, jer je posledica pogrešnog `$unset`-a (obrisana stvarna
 * odluka) mnogo gora od posledice propuštenog kandidata (sekcija ostane
 * `false`, kao i danas).
 */
function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return value === true;
  if (Array.isArray(value)) return value.some(isMeaningful);
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, inner]) => !NEVER_CONTENT.has(key) && isMeaningful(inner),
    );
  }
  return false;
}

/** Ima li sekcija autorskog sadržaja pored samog `enabled` flag-a. */
export function hasMeaningfulContent(section: unknown): boolean {
  if (section === null || section === undefined) return false;
  if (typeof section !== "object" || Array.isArray(section)) return false;
  return Object.entries(section as Record<string, unknown>).some(
    ([key, value]) => !NEVER_CONTENT.has(key) && isMeaningful(value),
  );
}

/** Klasifikuje jednu sekciju. `section` je sirov objekat iz Mongo-a. */
export function classifySection(
  name: Theme9TristateSection,
  section: unknown,
): SectionClassification {
  if (section === null || section === undefined || typeof section !== "object") {
    return {
      section: name,
      enabled: undefined,
      meaningfulContent: false,
      decision: "section_missing",
    };
  }

  const raw = section as Record<string, unknown>;
  const enabled =
    typeof raw.enabled === "boolean" ? (raw.enabled as boolean) : undefined;
  const meaningfulContent = hasMeaningfulContent(raw);

  let decision: SectionDecision;
  if (enabled === undefined) decision = "already_absent";
  else if (enabled === true) decision = "keep_enabled";
  else decision = meaningfulContent ? "review_has_content" : "unset_candidate";

  return { section: name, enabled, meaningfulContent, decision };
}

export interface ProfileClassification {
  /** `landingTheme` iz profila — samo za izveštaj, ne utiče na odluku. */
  theme: string | undefined;
  sections: SectionClassification[];
  /** Putanje za `$unset`, npr. `landingStructure.landing.topicHub.enabled`. */
  unsetPaths: string[];
}

/**
 * Klasifikuje ceo `SalonProfile`.
 *
 * Skenira se SVAKI profil, ne samo theme-9: `default: false` je materijalizovao
 * `enabled` na svakom dokumentu sačuvanom dok je default postojao, bez obzira
 * koju temu tenant koristi.
 */
export function classifyProfile(profile: unknown): ProfileClassification {
  const doc = (profile ?? {}) as Record<string, unknown>;
  const landing = (
    ((doc.landingStructure ?? {}) as Record<string, unknown>).landing ?? {}
  ) as Record<string, unknown>;

  const sections = THEME9_TRISTATE_SECTIONS.map((name) =>
    classifySection(name, landing[name]),
  );

  return {
    theme: typeof doc.landingTheme === "string" ? doc.landingTheme : undefined,
    sections,
    unsetPaths: sections
      .filter((s) => s.decision === "unset_candidate")
      .map((s) => `landingStructure.landing.${s.section}.enabled`),
  };
}
