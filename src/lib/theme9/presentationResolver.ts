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
 *             ├── prazno + neutral policy → default
 *             └── prazno + bez fallback-a → hidden
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
  | "authored"
  /** Neutralan tekst na nivou teme (payload dolazi u 2B.3). */
  | "default";

/** Šta tema radi kad odluke nema, a sadržaja nema. */
export type SectionFallbackPolicy = "hide" | "neutral";

export interface SectionPresentationInput {
  /** Tri-state iz baze: `undefined` = nema odluke. */
  enabled: boolean | undefined;
  /** Ima li sekcija autorskog sadržaja pored samog `enabled`. */
  hasAuthoredContent: boolean;
  /** Politika teme za tu sekciju. */
  policy: SectionFallbackPolicy;
}

/**
 * Jedno pravilo, tri koraka — redosled je ugovor:
 *
 *   1. `enabled === false` je APSOLUTNI VETO. Ne nadjačava ga ni sadržaj ni
 *      policy. Vlasnica je rekla ne.
 *   2. Autorski sadržaj bez veta se UVEK prikazuje. Sadržaj koji postoji, a
 *      odluka nije doneta, ne sme da nestane samo zato što niko nije kliknuo
 *      prekidač.
 *   3. Tek prazna sekcija bez veta pada na policy.
 */
export function resolveSectionPresentation(
  input: SectionPresentationInput,
): SectionPresentation {
  if (input.enabled === false) return "hidden";
  if (input.hasAuthoredContent) return "authored";
  return input.policy === "neutral" ? "default" : "hidden";
}

/**
 * Politika po sekciji.
 *
 * 2B.2 namerno postavlja SVE na `hide` — time se ponašanje ne menja i resolver
 * se može bezbedno pustiti pre nego što neutralni tekstovi uopšte postoje.
 * 2B.3 prebacuje pojedine sekcije na `neutral` i tek tada donosi payload.
 *
 * Zapisano u `docs/TODO.md` §2B.3: policy coverage 7/7, neutralni payload samo
 * 3 od 7 (`audiencePaths`, `guidedCareProcess`, `finalCta`). Ostale ostaju
 * `hide` iz sadržinskih razloga — teme, reference i buduće Education ponude se
 * ne izmišljaju.
 */
export const THEME9_FALLBACK_POLICY: Record<
  Theme9TristateSection,
  SectionFallbackPolicy
> = {
  audiencePaths: "hide",
  topicHub: "hide",
  guidedCareProcess: "hide",
  credentials: "hide",
  featuredEducation: "hide",
  professionalPath: "hide",
  finalCta: "hide",
};

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
  key: Theme9TristateSection,
  section: unknown,
  policy: Record<
    Theme9TristateSection,
    SectionFallbackPolicy
  > = THEME9_FALLBACK_POLICY,
): SectionPresentation {
  const raw =
    section && typeof section === "object" && !Array.isArray(section)
      ? (section as Record<string, unknown>)
      : undefined;

  return resolveSectionPresentation({
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : undefined,
    hasAuthoredContent: hasMeaningfulContent(raw),
    policy: policy[key],
  });
}
