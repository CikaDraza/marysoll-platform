// Unified SEO report types — shared by platform + tenant SEO flows.
// Phase 1: the deterministic Technical Audit attaches `technical` to existing
// analysis results. `SeoReport` is the target unified shape for Phase 2.

export type SeoConfidence = "high" | "medium" | "low";

export type SeoCategory =
  | "technical"
  | "metadata"
  | "content"
  | "cta"
  | "conversion"
  | "funnel";

export type SeoSeverity = "critical" | "warning" | "info";

export interface SeoFinding {
  /** Stable machine id, e.g. "missing-h1", "broken-anchor". */
  id: string;
  title: string;
  detail: string;
  confidence: SeoConfidence;
  category: SeoCategory;
  severity: SeoSeverity;
  /** Whether an auto-fix flow can address this finding. */
  fixable: boolean;
  suggestion?: string;
  /** Which page/url this finding refers to (multi-page audits). */
  page?: string;
}

export type SeoImageType =
  | "img"
  | "next-image"
  | "picture"
  | "video-poster"
  | "iframe"
  | "background-image";

export interface SeoImageInventoryItem {
  type: SeoImageType;
  src: string;
  alt?: string;
}

/** Deterministic, code-measured technical signals (no LLM). */
export interface TechnicalAuditSignals {
  h1Count: number;
  headingCount: number;
  hasTitle: boolean;
  titleLength: number;
  hasDescription: boolean;
  descriptionLength: number;
  hasCanonical: boolean;
  robots: string;
  isNoindex: boolean;
  hasSchema: boolean;
  schemaTypes: string[];
  imageCount: number;
  imagesByType: Partial<Record<SeoImageType, number>>;
  imagesMissingAlt: number;
  internalLinkCount: number;
  brokenAnchors: string[];
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  /** Page urls/keys sharing identical title or description. */
  duplicateTitles: string[];
  duplicateDescriptions: string[];
}

export interface TechnicalAuditReport {
  findings: SeoFinding[];
  signals: TechnicalAuditSignals;
  /** Where the audited data came from. */
  source: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
}

/** Unified report produced by the shared SEO core (Phase 2). */
export interface SeoReport {
  score: number;
  findings: SeoFinding[];
  keywords: string[];
  technical?: TechnicalAuditReport;
  snapshotSource?: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
  // ── Back-compat (derived from findings) so existing UIs and auto-fix
  //    routes keep working without changes. ──
  issues: string[];
  suggestions: string[];
}
