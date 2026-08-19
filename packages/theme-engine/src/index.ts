/**
 * @panta/theme-engine — Theme/Layout granica.
 *
 * Engine zna: brand, layout, sekcije, slotove, raspored blokova, verzije.
 * Engine NE zna: Service, Appointment, EducationOffering, Campaign, Lead, Loyalty.
 *
 * Spec: docs/PANTA-T2-THEME-LAYOUT-ENGINE.md
 */

export type {
  BlockTypeResolver,
  LayoutBlock,
  LayoutDefinition,
  LayoutSection,
  SectionDefinition,
  SectionVariantDefinition,
  SlotDefinition,
  ThemeBrand,
  ThemeDocument,
  ThemeLifecycle,
  ValidationCode,
  ValidationIssue,
  ValidationResult,
} from "./types";

export {
  DEFAULT_VARIANT,
  selectRenderableBlocks,
  validateThemeDocument,
} from "./validate";
export type { ValidateOptions, ValidationMode } from "./validate";

export {
  assertTransition,
  canTransition,
  deriveDraftFrom,
  isImmutable,
  publishRevision,
} from "./lifecycle";
export type { PublishResult } from "./lifecycle";
