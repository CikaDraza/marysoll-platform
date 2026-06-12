import "server-only";

import type {
  SeoConfidence,
  SeoFinding,
  SeoReport,
  SeoSeverity,
  TechnicalAuditReport,
} from "@/types/seo-report";
import type { SeoAgentResult } from "./context";

const SEVERITY_PENALTY: Record<SeoSeverity, number> = {
  critical: 14,
  warning: 6,
  info: 1,
};

const CONFIDENCE_WEIGHT: Record<SeoConfidence, number> = {
  high: 1,
  medium: 0.5,
  low: 0.25,
};

const SEVERITY_RANK: Record<SeoSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const CONFIDENCE_RANK: Record<SeoConfidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function dedupe(findings: SeoFinding[]): SeoFinding[] {
  const seen = new Set<string>();
  const out: SeoFinding[] = [];
  for (const f of findings) {
    const key = `${f.category}|${f.id}|${f.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export function aggregateSeoReport(args: {
  technical: TechnicalAuditReport[];
  agentResults: SeoAgentResult[];
  crossPageFindings?: SeoFinding[];
  snapshotSource?: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
}): SeoReport {
  const technicalFindings = args.technical.flatMap((t) => t.findings);
  const agentFindings = args.agentResults.flatMap((r) => r.findings);

  const merged = dedupe([
    ...technicalFindings,
    ...(args.crossPageFindings ?? []),
    ...agentFindings,
  ]).sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence],
  );

  const agentAvg = args.agentResults.length
    ? args.agentResults.reduce((sum, r) => sum + (r.score || 0), 0) /
      args.agentResults.length
    : 70;

  const penalty = merged.reduce(
    (sum, f) =>
      sum + SEVERITY_PENALTY[f.severity] * CONFIDENCE_WEIGHT[f.confidence],
    0,
  );

  const score = Math.max(0, Math.min(100, Math.round(agentAvg - penalty)));

  const keywords = Array.from(
    new Set(args.agentResults.flatMap((r) => r.keywords)),
  ).slice(0, 20);

  // Back-compat fields (derived) so existing UIs and auto-fix routes keep working.
  const issues = merged
    .filter((f) => f.severity !== "info")
    .map((f) => `[${f.confidence}] ${f.title}: ${f.detail}`);
  const suggestions = merged.flatMap((f) =>
    f.suggestion ? [f.suggestion] : [],
  );

  return {
    score,
    findings: merged,
    keywords,
    technical: args.technical[0],
    issues,
    suggestions,
    snapshotSource: args.snapshotSource,
    crawlUrl: args.crawlUrl,
    crawlError: args.crawlError,
  };
}
