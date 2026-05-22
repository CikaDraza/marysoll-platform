import "server-only";

import { callDeepSeek, DeepSeekMessage } from "../agents";
import type { SeoData } from "@/types";
import type { SeoCmsContext } from "./seoAgentLandingTheme";
import type { TenantSeoPageSnapshot } from "@/lib/seo/tenantSeoCrawl";

export interface MetadataSeoAnalysisInput {
  seo: SeoData;
  seoContext?: SeoCmsContext;
  renderedPages?: TenantSeoPageSnapshot[];
  crawlUrl?: string;
}

export interface MetadataSeoAnalysisOutput {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
  snapshotSource?: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
}

export interface MetadataSeoFixInput {
  seo: SeoData;
  seoResult: MetadataSeoAnalysisOutput;
  seoContext?: SeoCmsContext;
  renderedPages?: TenantSeoPageSnapshot[];
}

export interface MetadataSeoFixOutput {
  seo: SeoData;
}

const ANALYSIS_SYSTEM_PROMPT = `
You are an expert SEO metadata strategist for local beauty service businesses.

Analyze only SEO metadata for three pages:
- Home page
- Services page
- Appointments page

Focus on:
- Title length and clarity (ideal 45-60 characters)
- Description length and clarity (ideal 120-160 characters)
- Local intent (city, street/area when available)
- Service intent based on the provided service catalog
- Uniqueness between pages
- Conversion intent without spam

Important:
- When rendered page snapshots are provided, analyze the final metadata from the rendered HTML for each page as the source of truth.
- Do not penalize missing full service catalog, prices, durations or booking widgets. Those are rendered by the platform.
- For variant services, use "price from" and "duration from" context as proof that pricing/duration exists.
- Metadata should summarize the page, not duplicate full landing content.
- If a title is short but clear, service/location keywords can be in description.

Output JSON only:
{
  "score": number,
  "issues": string[],
  "suggestions": string[],
  "keywords": string[]
}
`;

const FIX_SYSTEM_PROMPT = `
You are an expert SEO metadata copywriter for local beauty service businesses.

Rewrite SEO title and description for:
- Home page
- Services page
- Appointments page

Rules:
1. Output JSON only with this exact shape:
{
  "homeTitle": string,
  "homeDescription": string,
  "uslugeTitle": string,
  "uslugeDescription": string,
  "terminiTitle": string,
  "terminiDescription": string
}
2. Correct spelling, typos, grammar and awkward phrasing.
3. Title max 60 characters.
4. Description max 160 characters.
5. Use Serbian Latin script.
6. Make every page unique.
7. Use salon name, city and service intent naturally.
8. Do not invent services, prices, durations or opening hours.
9. For services page, mention catalog/prices/booking only if services context exists.
10. For appointments page, emphasize booking/termini clearly.
11. Avoid keyword stuffing and exaggerated claims.
`;

function buildRenderedPagesSummary(renderedPages?: TenantSeoPageSnapshot[]) {
  if (!renderedPages?.length) return "";

  return `
RENDERED PAGE METADATA:
${renderedPages
  .map((page) => {
    if (!page.snapshot) {
      return `
${page.page.toUpperCase()}:
  URL: ${page.url}
  Crawl error: ${page.error || "(unknown)"}
`.trim();
    }

    const meta = page.snapshot.finalMetadata;
    return `
${page.page.toUpperCase()}:
  URL: ${page.url}
  Title: ${meta.title || "(empty)"}
  Description: ${meta.description || "(empty)"}
  OG title: ${meta.ogTitle || "(empty)"}
  OG description: ${meta.ogDescription || "(empty)"}
  OG image: ${meta.ogImage || "(empty)"}
  Canonical: ${meta.canonical || "(empty)"}
  Robots: ${meta.robots || "(empty)"}
  H1/H2 sample: ${page.snapshot.headingStructure
    .slice(0, 6)
    .map((h) => `${h.level}: ${h.text}`)
    .join(" | ") || "(none)"}
`.trim();
  })
  .join("\n\n")}
`.trim();
}

function buildMetadataSummary(
  seo: SeoData,
  seoContext?: SeoCmsContext,
  renderedPages?: TenantSeoPageSnapshot[],
) {
  const hasRenderedPages = renderedPages?.some((page) => page.snapshot) ?? false;
  const serviceSummary =
    hasRenderedPages
      ? "(omitted; rendered public pages are source of truth)"
      : seoContext?.services
      ?.slice(0, 10)
      .map((service) => {
        const price =
          service.hasPriceOnRequest || service.priceMode === "on_request"
            ? "price on request"
            : service.priceFrom
              ? `from ${service.priceFrom}`
              : "price missing";
        const duration = service.durationFrom
          ? `from ${service.durationFrom} min`
          : "duration missing";
        return `${service.name || "(unnamed)"} / ${service.category || "(no category)"} / ${price} / ${duration}`;
      })
      .join(" | ") || "(empty)";

  return `
SALON:
  Name: ${seoContext?.salon?.name || "(empty)"}
  City: ${seoContext?.salon?.city || "(empty)"}
  Street: ${seoContext?.salon?.street || "(empty)"}

SERVICES CONTEXT:
  Services in database: ${hasRenderedPages ? "(omitted; rendered public pages are source of truth)" : (seoContext?.services?.length ?? 0)}
  Sample: ${serviceSummary}

METADATA:
  Home title: ${seo.homeTitle || "(empty)"}
  Home description: ${seo.homeDescription || "(empty)"}
  Services title: ${seo.uslugeTitle || "(empty)"}
  Services description: ${seo.uslugeDescription || "(empty)"}
  Appointments title: ${seo.terminiTitle || "(empty)"}
  Appointments description: ${seo.terminiDescription || "(empty)"}

${buildRenderedPagesSummary(renderedPages)}
`.trim();
}

function normalizeMetadataSeo(seo: SeoData): SeoData {
  return {
    homeTitle: (seo.homeTitle ?? "").slice(0, 60),
    homeDescription: (seo.homeDescription ?? "").slice(0, 160),
    uslugeTitle: (seo.uslugeTitle ?? "").slice(0, 60),
    uslugeDescription: (seo.uslugeDescription ?? "").slice(0, 160),
    terminiTitle: (seo.terminiTitle ?? "").slice(0, 60),
    terminiDescription: (seo.terminiDescription ?? "").slice(0, 160),
  };
}

export async function analyzeMetadataSeo(
  input: MetadataSeoAnalysisInput,
): Promise<MetadataSeoAnalysisOutput> {
  const { seo, seoContext } = input;
  const { renderedPages, crawlUrl } = input;
  const content = buildMetadataSummary(seo, seoContext, renderedPages);

  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Analyze this SEO metadata:\n\n${content}`,
    },
  ];

  const response = await callDeepSeek({
    agent: "metadataSeo",
    messages,
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    jsonMode: true,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Metadata SEO agent error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const aiContent = data.choices?.[0]?.message?.content;
  if (!aiContent) throw new Error("No content in metadata SEO agent response");

  try {
    const parsed = JSON.parse(aiContent) as MetadataSeoAnalysisOutput;
    const crawlErrors = (renderedPages ?? [])
      .map((page) => page.error)
      .filter(Boolean)
      .join(" | ");
    return {
      ...parsed,
      snapshotSource: renderedPages?.some((page) => page.snapshot)
        ? "rendered-dom"
        : "cms",
      crawlUrl,
      crawlError: crawlErrors || undefined,
    };
  } catch (e) {
    throw new Error(`Metadata SEO agent returned invalid JSON: ${e}`);
  }
}

export async function autoFixMetadataSeo(
  input: MetadataSeoFixInput,
): Promise<MetadataSeoFixOutput> {
  const { seo, seoResult, seoContext } = input;
  const content = buildMetadataSummary(seo, seoContext, input.renderedPages);

  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `
Current metadata:
${content}

SEO analysis:
Score: ${seoResult.score}/100
Issues: ${seoResult.issues.join("; ")}
Suggestions: ${seoResult.suggestions.join("; ")}
Recommended keywords: ${seoResult.keywords.join(", ")}

Rewrite and fix the metadata according to the rules.
`.trim(),
    },
  ];

  const response = await callDeepSeek({
    agent: "metadataSeo",
    messages,
    systemPrompt: FIX_SYSTEM_PROMPT,
    jsonMode: true,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Metadata SEO auto-fix error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const aiContent = data.choices?.[0]?.message?.content;
  if (!aiContent)
    throw new Error("No content in metadata SEO auto-fix response");

  try {
    const parsed = JSON.parse(aiContent) as SeoData;
    return { seo: normalizeMetadataSeo(parsed) };
  } catch (e) {
    throw new Error(`Metadata SEO auto-fix returned invalid JSON: ${e}`);
  }
}
