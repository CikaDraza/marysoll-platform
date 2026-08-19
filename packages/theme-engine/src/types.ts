/**
 * Theme/Layout Engine — kontrakt.
 *
 * Spec: docs/PANTA-T2-THEME-LAYOUT-ENGINE.md (Architecture Review v0.2).
 *
 * PRAVILO GRANICE: ovde ne sme da uđe nijedan pojam poslovne vertikale
 * (Service, Appointment, EducationOffering, Campaign, Lead, Loyalty). Engine zna
 * samo raspored: sekcije, slotove, blokove, brand i verzije. Šta je blok i
 * odakle mu podaci zna Feature Block Registry u aplikaciji.
 */

/** Blok = jedna registrovana feature jedinica smeštena u slot. */
export interface LayoutBlock {
  id: string;
  /** npr. "services.catalog" — engine ga NE tumači, samo prosleđuje registry-ju. */
  type: string;
  /** Verzija `config` sheme tog tipa bloka; registry zna koje podržava. */
  schemaVersion: number;
  /** Mora postojati u SectionDefinition varijante ove sekcije. */
  slot: string;
  /** Validira feature schema u aplikaciji, ne engine. */
  config?: unknown;
}

export interface LayoutSection {
  id: string;
  /** Referenca na SectionDefinition iz LayoutDefinition-a. */
  sectionType: string;
  /** Varijanta te definicije; kad izostane koristi se "default". */
  variant?: string;
  blocks: LayoutBlock[];
}

export type ThemeLifecycle = "draft" | "published" | "archived" | "preview";

export interface ThemeBrand {
  logo?: string;
  colors: Record<string, string>;
  typography: Record<string, unknown>;
}

export interface ThemeDocument {
  version: number;
  /** Koji skup SectionDefinition-a važi za ovaj dokument. */
  layoutDefinitionId: string;
  brand: ThemeBrand;
  sections: LayoutSection[];
  lifecycle: ThemeLifecycle;
}

// ─── Layout definicije ────────────────────────────────────────────────────────

export interface SlotDefinition {
  name: string;
  maxBlocks?: number;
  /**
   * Opciono ograničenje po `type` bloka. NIJE vertikalno znanje — aplikacija
   * puni listu iz registry-ja, engine je samo poredi.
   */
  accepts?: "any" | string[];
}

export interface SectionVariantDefinition {
  slots: SlotDefinition[];
}

export interface SectionDefinition {
  sectionType: string;
  variants: Record<string, SectionVariantDefinition>;
}

export interface LayoutDefinition {
  /** = ThemeDocument.layoutDefinitionId */
  id: string;
  version: number;
  sections: SectionDefinition[];
}

// ─── Rezultati validacije ─────────────────────────────────────────────────────

export type ValidationCode =
  | "duplicate_section_id"
  | "duplicate_block_id"
  | "unknown_layout_definition"
  | "unknown_section_type"
  | "unknown_variant"
  | "unknown_slot"
  | "slot_over_capacity"
  | "block_type_not_accepted"
  | "unknown_block_type"
  | "unsupported_schema_version"
  | "invalid_version"
  | "illegal_lifecycle_transition"
  | "immutable_revision";

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  /** Putanja do mesta greške, npr. "sections[1].blocks[0]". */
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

/**
 * Registry provera koju engine dobija spolja — tako ostaje neutralan, a i dalje
 * može da odbije publish nepoznatog bloka (spec 5.1).
 */
export interface BlockTypeResolver {
  isKnownType(type: string): boolean;
  supportsSchemaVersion(type: string, schemaVersion: number): boolean;
}
