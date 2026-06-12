import "server-only";

import { callDeepSeek } from "../agents";
import type {
  MarketingLandingStructure,
  MarketingSeoAnalysisResult,
} from "@/types/marketing-landing";
import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";

// NOTE: marketing SEO analysis now runs through the shared core
// (src/lib/ai/agents/seo/analyzeSeo.ts). This file keeps only the
// auto-fix and typo-fix flows.

export async function autoFixMarketingLandingSeo(input: {
  marketingLanding: MarketingLandingStructure;
  snapshot: LandingRenderSnapshot;
  seoResult: MarketingSeoAnalysisResult;
}): Promise<MarketingLandingStructure> {
  const response = await callDeepSeek({
    agent: "landingContent",
    jsonMode: true,
    systemPrompt: `You are a SaaS SEO copywriter for Marysoll marketing pages.
Return ONLY the complete updated MarketingLandingStructure JSON.
Rules:
- Preserve the exact structure and all enabled, href, popular, price, period, icon and seo.ogImage values.
- Update copy fields and seo.homeTitle/homeDescription only.
- Correct spelling and awkward phrasing.
- Use Serbian Latin script unless existing text is intentionally English.
- Add natural SaaS keywords without stuffing.
- Make pricing plan names/descriptions clearer for search and conversion, but keep prices unchanged.
- Keep CTA text short and action-oriented.`,
    messages: [
      {
        role: "user",
        content: `
Current marketingLanding:
${JSON.stringify(input.marketingLanding, null, 2)}

Rendered snapshot:
${JSON.stringify(input.snapshot, null, 2)}

Unified SEO result:
${JSON.stringify(input.seoResult, null, 2)}

Rewrite the CMS copy and metadata to address the issues and suggestions.
`.trim(),
      },
    ],
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`marketing landing auto-fix error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) throw new Error("Marketing landing auto-fix returned no content");
  if (choice.finish_reason === "length") {
    throw new Error(
      "Marketing landing auto-fix output was truncated (hit max_tokens).",
    );
  }
  return JSON.parse(content) as MarketingLandingStructure;
}

/**
 * Typo-only fix — ispravlja ISKLJUČIVO pravopisne/slovne greške u CMS tekstu,
 * bez SEO prepravke, bez menjanja smisla, redosleda ili ključnih reči.
 * Ne zahteva prethodnu SEO analizu.
 */
export async function typoFixMarketingLanding(
  marketingLanding: MarketingLandingStructure,
): Promise<MarketingLandingStructure> {
  const response = await callDeepSeek({
    agent: "landingContent",
    jsonMode: true,
    systemPrompt: `You are a Serbian (Latin script) proofreader for Marysoll marketing pages.
Return ONLY the complete updated MarketingLandingStructure JSON, with the exact same shape as the input.
This is SPELLING/TYPO correction ONLY — it is NOT an SEO or content rewrite.
Rules:
- Fix ONLY spelling mistakes, typos, wrong/missing diacritics, doubled or missing letters, and obvious orthographic errors.
- Do NOT rephrase, rewrite, shorten, expand, reorder, translate, or "improve" any text.
- Do NOT change meaning, tone, wording, keywords, SEO, metadata intent or punctuation beyond fixing the typo itself.
- If a word is already correct, leave it byte-for-byte unchanged.
- Preserve ALL non-text values exactly: enabled, href, popular, price, period, icon, image, seo.ogImage and anchors (e.g. "#faq").
- Preserve the exact JSON structure, all keys, and array lengths and order.
- The brand name is always "Marysoll" — correct any variant (e.g. "Maryosoll", "Marysol", "Mary soll", "MarySoll" inside running copy) to "Marysoll".
- Keep proper Serbian Latin orthography (e.g. "korišćenje", "ogroman", "č/ć/š/ž/đ").`,
    messages: [
      {
        role: "user",
        content: `Correct only spelling/typo mistakes in this marketingLanding JSON and return the full corrected JSON:\n\n${JSON.stringify(
          marketingLanding,
          null,
          2,
        )}`,
      },
    ],
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `marketing landing typo-fix error: ${response.status} - ${error}`,
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) throw new Error("Marketing landing typo-fix returned no content");
  if (choice.finish_reason === "length") {
    throw new Error(
      "Marketing landing typo-fix output was truncated (hit max_tokens).",
    );
  }
  return JSON.parse(content) as MarketingLandingStructure;
}
