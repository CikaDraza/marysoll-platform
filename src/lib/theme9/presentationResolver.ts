/**
 * lib/theme9/presentationResolver.ts — 2B.2 presentation resolver
 *
 * Sloj IZMEĐU podataka i prikaza. Čist modul: bez DB-a, bez React-a, bez I/O.
 *
 *     definitions.load()            ← samo domenski/persistence podaci
 *             │ raw authored data
 *             ▼
 *     presentation resolver         ← OVDE
 *             ├── enabled=false           → hidden
 *             ├── ima autorski sadržaj    → authored
 *             └── nema autorskog sadržaja → hidden
 *             ▼
 *     mapper → komponenta
 *
 * ZAŠTO ZASEBAN SLOJ
 * `definitions.ts` ne sme da sazna za `enabled` — njegovo zaglavlje to izričito
 * kaže, a svih sedam theme-9 loadera vraća samo `{ content }`. Da loader počne
 * da odlučuje vidljivost, generički Feature Block loader bi primio theme-9
 * presentation policy. Zato odluka živi ovde, a loader ostaje neutralan.
 *
 * OBIM: SAMO SEDAM THEME-9 SEKCIJA
 * `about` zadržava svoj tenant-derived fallback, `blog` ostaje runtime-data
 * policy sa `default: false`, `hero` postojeći mapper ugovor. Generalizacija na
 * svih 10 blokova bi theme-9 popravkom promenila ponašanje tema 1–8.
 *
 * NAPOMENA O IMPORTU: relativni import nosi `.ts` ekstenziju namerno. Moduli u
 * `src/lib/theme9/` se uvoze i iz `scripts/*.mts` (vidi
 * `normalize-theme9-section-state.mts`), a cist Node ESM ne razresava
 * extensionless putanje. `allowImportingTsExtensions` je vec ukljucen u
 * tsconfig-u, pa tsc i bundler to prihvataju bez izmene.
 */
import {
  THEME9_TRISTATE_SECTIONS,
  hasMeaningfulContent,
  type Theme9TristateSection,
} from "./sectionNormalization.ts";

/** Šta se na kraju renderuje. */
export type SectionPresentation =
  /** Ništa — blok se ne upisuje u dokument. */
  | "hidden"
  /** Sadržaj koji je vlasnica napisala. */
  | "authored";

export interface SectionPresentationInput {
  /** Tri-state iz baze: `undefined` = nema odluke. */
  enabled: boolean | undefined;
  /** Ima li sekcija autorskog sadržaja pored samog `enabled`. */
  hasAuthoredContent: boolean;
}

/**
 * Jedno pravilo, tri koraka — redosled je ugovor:
 *
 *   1. `enabled === false` je APSOLUTNI VETO. Ne nadjačava ga ni sadržaj ni
 *      policy. Vlasnica je rekla ne.
 *   2. Autorski sadržaj bez veta se UVEK prikazuje. Sadržaj koji postoji, a
 *      odluka nije doneta, ne sme da nestane samo zato što niko nije kliknuo
 *      prekidač.
 *   3. Prazna sekcija nema javni sadržaj i zato ostaje skrivena. Starter/demo
 *      copy mora biti persisted tenant sadržaj, nikada runtime fallback.
 */
export function resolveSectionPresentation(
  input: SectionPresentationInput,
): SectionPresentation {
  if (input.enabled === false) return "hidden";
  if (input.hasAuthoredContent) return "authored";
  return "hidden";
}

const TRISTATE_SET: ReadonlySet<string> = new Set(THEME9_TRISTATE_SECTIONS);

/** Da li ova sekcija uopšte ide kroz theme-9 resolver. */
export function isTheme9TristateSection(
  key: string,
): key is Theme9TristateSection {
  return TRISTATE_SET.has(key);
}

/**
 * Presentation za jednu sekciju, direktno iz sirovog CMS objekta.
 *
 * `section` je `landingStructure.landing[key]` — može biti `undefined`.
 */
export function resolveTheme9Section(
  section: unknown,
): SectionPresentation {
  const raw =
    section && typeof section === "object" && !Array.isArray(section)
      ? (section as Record<string, unknown>)
      : undefined;

  return resolveSectionPresentation({
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : undefined,
    hasAuthoredContent: hasMeaningfulContent(raw),
  });
}
