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
} from "./types.js";

export {
  DEFAULT_VARIANT,
  selectRenderableBlocks,
  validateThemeDocument,
} from "./validate.js";
export type { ValidateOptions, ValidationMode } from "./validate.js";

export {
  assertTransition,
  canTransition,
  deriveDraftFrom,
  isImmutable,
  publishRevision,
} from "./lifecycle.js";
export type { PublishResult } from "./lifecycle.js";
