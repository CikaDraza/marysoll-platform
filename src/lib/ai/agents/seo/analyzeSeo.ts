import "server-only";

import type { SeoReport } from "@/types/seo-report";
import {
  buildAgentContext,
  buildMetadataContext,
  type AnalyzeSeoInput,
  type SeoAgentResult,
} from "./context";
import {
  contentFunnelAgent,
  ctaConversionAgent,
  metadataQualityAgent,
} from "./team";
import { aggregateSeoReport } from "./aggregate";

/**
 * Shared SEO core — runs the selected LLM agent team in parallel over the
 * (deterministically audited) snapshot, then aggregates into one SeoReport.
 * Reused by all three entry points (platform, tenant landing, tenant metadata).
 */
export async function analyzeSeo(input: AnalyzeSeoInput): Promise<SeoReport> {
  const primary = input.pages[0];
  const primaryTechnical = input.technical[0];

  const runners: Promise<SeoAgentResult>[] = [];

  if (input.agents.includes("content") || input.agents.includes("cta")) {
    const ctx = primary
      ? buildAgentContext({
          snapshot: primary.snapshot,
          technical: primaryTechnical,
          businessContext: input.businessContext,
          cmsContext: input.cmsContext,
        })
      : `BUSINESS CONTEXT:\n  Brand/scope: ${input.businessContext.scopeLabel}\n  City: ${input.businessContext.city || "(not provided)"}\n\nNO RENDERED SNAPSHOT (live crawl unavailable) — analyze from CMS context below.\n\nCMS CONTEXT:\n${input.cmsContext ?? "(none)"}`;

    if (input.agents.includes("content")) runners.push(contentFunnelAgent(ctx));
    if (input.agents.includes("cta")) runners.push(ctaConversionAgent(ctx));
  }

  if (input.agents.includes("metadata") && input.pages.length > 0) {
    const metaCtx = buildMetadataContext(input.pages, input.businessContext);
    runners.push(metadataQualityAgent(metaCtx));
  }

  const agentResults = await Promise.all(runners);

  return aggregateSeoReport({
    technical: input.technical,
    agentResults,
    crossPageFindings: input.crossPageFindings,
    snapshotSource: primary?.snapshot.source ?? "cms",
    crawlUrl: input.crawlUrl,
    crawlError: input.crawlError,
  });
}
