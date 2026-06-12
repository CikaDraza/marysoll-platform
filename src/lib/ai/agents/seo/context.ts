import "server-only";

import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import type {
  SeoFinding,
  TechnicalAuditReport,
} from "@/types/seo-report";

export interface SeoBusinessContext {
  brand: string;
  productCategory: string;
  audience: string;
  city?: string;
  /** Human label, e.g. "Marysoll marketing platform" or salon name. */
  scopeLabel: string;
}

export type SeoAgentName = "content" | "cta" | "metadata";

/** Raw JSON returned by each LLM team member (before tagging). */
export interface SeoAgentRaw {
  score: number;
  keywords?: string[];
  findings: {
    title: string;
    detail: string;
    severity?: "critical" | "warning" | "info";
    suggestion?: string;
  }[];
}

/** Normalized result after tagging confidence/category. */
export interface SeoAgentResult {
  score: number;
  keywords: string[];
  findings: SeoFinding[];
}

export interface AnalyzeSeoInput {
  scope: "platform" | "tenant-landing" | "tenant-metadata";
  /** Page snapshots; first is the primary page. */
  pages: { key: string; snapshot: LandingRenderSnapshot }[];
  /** Deterministic audit per page (same order as pages). */
  technical: TechnicalAuditReport[];
  /** Cross-page deterministic findings (e.g. duplicate metadata). */
  crossPageFindings?: SeoFinding[];
  businessContext: SeoBusinessContext;
  /** Optional CMS-side context (rich section/service data) for better copy. */
  cmsContext?: string;
  agents: SeoAgentName[];
  crawlUrl?: string;
  crawlError?: string;
}

function technicalFactsBlock(technical?: TechnicalAuditReport): string {
  if (!technical) return "VERIFIED TECHNICAL FACTS: (none — no rendered snapshot)";
  const s = technical.signals;
  const imgByType = Object.entries(s.imagesByType)
    .map(([type, count]) => `${type}:${count}`)
    .join(", ");
  return `
VERIFIED TECHNICAL FACTS (already measured deterministically — DO NOT re-report or re-judge these; they are handled by the technical layer):
  Title: ${s.hasTitle ? `present (${s.titleLength} chars)` : "MISSING"}
  Description: ${s.hasDescription ? `present (${s.descriptionLength} chars)` : "MISSING"}
  H1 count: ${s.h1Count} | total headings: ${s.headingCount}
  Canonical: ${s.hasCanonical ? "present" : "missing"} | robots: ${s.robots || "(none)"} | noindex: ${s.isNoindex ? "YES" : "no"}
  Schema (JSON-LD): ${s.hasSchema ? s.schemaTypes.join(", ") || "present" : "missing"}
  Images: ${s.imageCount} (${imgByType || "none"}); missing alt: ${s.imagesMissingAlt}
  Broken anchors: ${s.brokenAnchors.length ? s.brokenAnchors.join(", ") : "none"}
  Sitemap.xml: ${s.hasSitemap ? "present" : "missing"} | robots.txt: ${s.hasRobotsTxt ? "present" : "missing"}
`.trim();
}

function renderedBlock(snapshot: LandingRenderSnapshot): string {
  const meta = snapshot.finalMetadata;
  return `
RENDERED PAGE (source of truth for visible content):
  URL: ${snapshot.url || "(empty)"}
  Title: ${meta.title || "(empty)"}
  Description: ${meta.description || "(empty)"}
  Headings: ${snapshot.headingStructure.map((h) => `${h.level}: ${h.text}`).join(" | ") || "(none)"}
  CTAs: ${snapshot.ctas.map((c) => `${c.text} -> ${c.href || "(no href)"}`).join(" | ") || "(none)"}
  Internal links: ${snapshot.internalLinks.map((l) => `${l.text} -> ${l.href}`).join(" | ") || "(none)"}
  Images by type: ${snapshot.images.map((i) => `${i.type || "img"} (alt: ${i.alt?.trim() || "—"})`).join(" | ") || "(none)"}

  Sections:
  ${
    snapshot.sections
      .map(
        (sec) =>
          `- ${sec.id} | heading: ${sec.heading ? `${sec.heading.level}: ${sec.heading.text}` : "(none)"} | copy: ${sec.visibleCopy.slice(0, 6).join(" / ") || "(none)"}`,
      )
      .join("\n  ") || "(none)"
  }

  Visible copy sample:
  ${snapshot.visibleCopy.slice(0, 24).join("\n  ") || "(none)"}
`.trim();
}

/** Builds the shared prompt context consumed by every team agent. */
export function buildAgentContext(args: {
  snapshot: LandingRenderSnapshot;
  technical?: TechnicalAuditReport;
  businessContext: SeoBusinessContext;
  cmsContext?: string;
}): string {
  const { snapshot, technical, businessContext, cmsContext } = args;
  return `
BUSINESS CONTEXT:
  Brand/scope: ${businessContext.scopeLabel} (${businessContext.brand})
  Product: ${businessContext.productCategory}
  Audience: ${businessContext.audience}
  City/locale: ${businessContext.city || "(not provided)"}

${technicalFactsBlock(technical)}

${renderedBlock(snapshot)}
${cmsContext ? `\nCMS CONTEXT (editable fields & catalog):\n${cmsContext}` : ""}
`.trim();
}

/** Metadata-only context for the metadata agent (may cover multiple pages). */
export function buildMetadataContext(
  pages: { key: string; snapshot: LandingRenderSnapshot }[],
  businessContext: SeoBusinessContext,
): string {
  return `
BUSINESS CONTEXT:
  Brand/scope: ${businessContext.scopeLabel}
  City/locale: ${businessContext.city || "(not provided)"}
  Audience: ${businessContext.audience}

PAGES METADATA (rendered, source of truth):
${pages
  .map((p) => {
    const m = p.snapshot.finalMetadata;
    return `  [${p.key}]
    Title: ${m.title || "(empty)"} (${(m.title || "").length} chars)
    Description: ${m.description || "(empty)"} (${(m.description || "").length} chars)
    H1/H2: ${p.snapshot.headingStructure.slice(0, 4).map((h) => `${h.level}:${h.text}`).join(" | ") || "(none)"}`;
  })
  .join("\n")}
`.trim();
}
