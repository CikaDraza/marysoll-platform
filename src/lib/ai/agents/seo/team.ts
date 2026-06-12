import "server-only";

import { callDeepSeek, type AgentType, type DeepSeekMessage } from "../../agents";
import type { SeoConfidence, SeoCategory, SeoFinding } from "@/types/seo-report";
import type { SeoAgentRaw, SeoAgentResult } from "./context";

const OUTPUT_CONTRACT = `
Return ONLY valid JSON with this exact shape:
{
  "score": number,            // 0-100 for YOUR dimension only
  "keywords": string[],       // high-intent keywords relevant to this business
  "findings": [
    { "title": string, "detail": string, "severity": "critical" | "warning" | "info", "suggestion": string }
  ]
}
Do not include any other keys or prose.`;

async function runAgent(
  agent: AgentType,
  systemPrompt: string,
  userContent: string,
): Promise<SeoAgentRaw> {
  const messages: DeepSeekMessage[] = [{ role: "user", content: userContent }];
  const response = await callDeepSeek({
    agent,
    messages,
    systemPrompt,
    jsonMode: true,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${agent} error: ${response.status} - ${error}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${agent} returned no content`);
  const parsed = JSON.parse(content) as Partial<SeoAgentRaw>;
  return {
    score: typeof parsed.score === "number" ? parsed.score : 70,
    keywords: parsed.keywords ?? [],
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function tagFindings(
  raw: SeoAgentRaw,
  opts: { confidence: SeoConfidence; category: SeoCategory; idPrefix: string },
): SeoFinding[] {
  return raw.findings
    .filter((f) => f.title?.trim())
    .map((f, i) => ({
      id: `${opts.idPrefix}-${slugify(f.title) || i}`,
      title: f.title.trim(),
      detail: (f.detail ?? "").trim(),
      confidence: opts.confidence,
      category: opts.category,
      severity: f.severity ?? "warning",
      fixable: true,
      suggestion: f.suggestion?.trim() || undefined,
    }));
}

// ── Content + Funnel agent ────────────────────────────────────────────────────
const CONTENT_SYSTEM = `You are a Content & Funnel SEO strategist for local beauty businesses and a salon-booking SaaS.
Your focus: natural, persuasive copy, local + service search intent, content completeness, and the marketing funnel (awareness → consideration → action) for salons and their services.
Strict rules:
- The VERIFIED TECHNICAL FACTS are already measured by a deterministic layer. DO NOT report technical issues (title/description/H1/canonical/robots/schema/alt/sitemap/links). Focus ONLY on copy, content depth, local/service intent, funnel stages and conversion narrative.
- Prefer natural language over keyword stuffing.
- Be specific to THIS page's rendered content; do not give generic advice.
- Tie suggestions to funnel stages and conversions for salons/services.
${OUTPUT_CONTRACT}`;

export async function contentFunnelAgent(
  context: string,
): Promise<SeoAgentResult> {
  const raw = await runAgent(
    "seoLandingTheme",
    CONTENT_SYSTEM,
    `Analyze content, copy quality and funnel for this page:\n\n${context}`,
  );
  return {
    score: raw.score,
    keywords: raw.keywords ?? [],
    findings: tagFindings(raw, {
      confidence: "medium",
      category: "content",
      idPrefix: "content",
    }),
  };
}

// ── CTA + Conversion agent ────────────────────────────────────────────────────
const CTA_SYSTEM = `You are a CTA & Conversion strategist for local beauty businesses and a salon-booking SaaS.
Your focus: CTA presence and clarity, footer CTA, pricing copy, testimonial/social-proof sections, and the conversion path.
Strict rules:
- These are CONVERSION findings, not technical SEO. Treat them as medium-confidence improvements.
- A <button onClick> that scrolls or opens a modal is NOT a broken link — never report it as a broken/missing link. Link integrity is handled by the technical layer.
- Judge the rendered CTAs and internal links provided. Suggest concrete CTA copy and placement for salons/services.
${OUTPUT_CONTRACT}`;

export async function ctaConversionAgent(
  context: string,
): Promise<SeoAgentResult> {
  const raw = await runAgent(
    "ctaStrategy",
    CTA_SYSTEM,
    `Analyze CTA strategy and conversion path for this page:\n\n${context}`,
  );
  return {
    score: raw.score,
    keywords: raw.keywords ?? [],
    findings: tagFindings(raw, {
      confidence: "medium",
      category: "conversion",
      idPrefix: "cta",
    }),
  };
}

// ── Metadata quality agent ────────────────────────────────────────────────────
const METADATA_SYSTEM = `You are a Metadata quality strategist for local beauty businesses and a salon-booking SaaS.
Your focus: the QUALITY of title and description — clarity, search intent, uniqueness between pages, local + service relevance and conversion appeal.
Strict rules:
- Length limits, presence and exact duplicates are already measured deterministically — do not just restate them; focus on QUALITY and intent improvements.
- Suggest concrete improved titles/descriptions where weak. Use city + service intent naturally, no stuffing.
${OUTPUT_CONTRACT}`;

export async function metadataQualityAgent(
  context: string,
): Promise<SeoAgentResult> {
  const raw = await runAgent(
    "metadataSeo",
    METADATA_SYSTEM,
    `Analyze metadata quality and search intent:\n\n${context}`,
  );
  return {
    score: raw.score,
    keywords: raw.keywords ?? [],
    findings: tagFindings(raw, {
      confidence: "medium",
      category: "metadata",
      idPrefix: "meta",
    }),
  };
}
