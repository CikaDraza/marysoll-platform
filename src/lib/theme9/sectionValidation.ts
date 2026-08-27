import type { LandingStructure } from "@/types";
import {
  THEME9_TRISTATE_SECTIONS,
  type Theme9TristateSection,
} from "./sectionNormalization";

type Landing = LandingStructure["landing"];

export interface Theme9ValidationIssue {
  section: Theme9TristateSection;
  sectionName: string;
  message: string;
  focusId: string;
}

export const THEME9_SECTION_NAMES: Record<Theme9TristateSection, string> = {
  audiencePaths: "Putanje za posetioce",
  topicHub: "Centar tema",
  guidedCareProcess: "Vođeni proces nege",
  credentials: "Zašto baš ona",
  featuredEducation: "Istaknuta edukacija",
  professionalPath: "Profesionalni put",
  finalCta: "Završni poziv",
};

export function theme9SectionId(section: Theme9TristateSection): string {
  return `theme9-section-${section}`;
}

export function theme9RequiredFieldId(section: Theme9TristateSection): string {
  return `theme9-required-${section}`;
}

/** Missing persistence blok ostaje prazan i zato čuva `enabled: undefined`. */
export function theme9EditorSection<K extends Theme9TristateSection>(
  landing: Landing,
  section: K,
): NonNullable<Landing[K]> {
  return (landing[section] ?? {}) as NonNullable<Landing[K]>;
}

function filled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasTitledItem(items: unknown): boolean {
  return (
    Array.isArray(items) &&
    items.some(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        filled((item as { title?: unknown }).title),
    )
  );
}

function issue(
  section: Theme9TristateSection,
  requirement: string,
): Theme9ValidationIssue {
  const sectionName = THEME9_SECTION_NAMES[section];
  return {
    section,
    sectionName,
    focusId: theme9RequiredFieldId(section),
    message: `Sekcija „${sectionName}” je uključena ili podrazumevana, ali nije popunjena. ${requirement} ili isključite sekciju.`,
  };
}

export function validateTheme9Sections(
  landing: Landing,
): Theme9ValidationIssue[] {
  const issues: Theme9ValidationIssue[] = [];

  for (const section of THEME9_TRISTATE_SECTIONS) {
    const block = theme9EditorSection(landing, section) as Record<
      string,
      unknown
    >;
    if (block.enabled === false) continue;

    switch (section) {
      case "audiencePaths":
        if (!hasTitledItem(block.paths))
          issues.push(issue(section, "Dodajte najmanje jednu putanju sa naslovom"));
        break;
      case "topicHub":
        if (!hasTitledItem(block.topics))
          issues.push(issue(section, "Dodajte najmanje jednu temu sa naslovom"));
        break;
      case "guidedCareProcess":
        if (!hasTitledItem(block.steps))
          issues.push(issue(section, "Dodajte najmanje jedan korak sa naslovom"));
        break;
      case "credentials":
        if (!hasTitledItem(block.pillars))
          issues.push(
            issue(section, "Dodajte najmanje jedan stub kredibiliteta sa naslovom"),
          );
        break;
      case "featuredEducation": {
        const learn = Array.isArray(block.learn) && block.learn.some(filled);
        if (!filled(block.headline) && !learn)
          issues.push(
            issue(section, "Unesite naslov ili najmanje jednu stavku šta se uči"),
          );
        break;
      }
      case "professionalPath":
        if (!hasTitledItem(block.formats))
          issues.push(issue(section, "Dodajte najmanje jedan format sa naslovom"));
        break;
      case "finalCta":
        if (!filled(block.headline)) {
          issues.push(issue(section, "Unesite naslov završnog poziva"));
        } else if (!filled(block.ctaLabel)) {
          issues.push(issue(section, "Unesite tekst dugmeta za zakazivanje"));
        }
        break;
    }
  }

  return issues;
}

/** Save gate je strogo Theme-9-only; legacy teme zadržavaju svoje ugovore. */
export function validateTheme9SectionsForTheme(
  theme: string | undefined,
  landing: Landing,
): Theme9ValidationIssue[] {
  return theme === "theme-9" ? validateTheme9Sections(landing) : [];
}
