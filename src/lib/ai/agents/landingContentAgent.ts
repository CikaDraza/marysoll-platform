/**
 * lib/ai/agents/landingContentAgent.ts
 *
 * Rewrites / auto-fixes landing page CMS content based on SEO analysis results.
 * Improves headlines, descriptions, CTAs and FAQ items.
 *
 * API key: process.env.API_KEY_LANDING_CONTENT
 */
import "server-only";

import { callDeepSeek, DeepSeekMessage } from "../agents";
import type { LandingStructure } from "@/types";
import type {
  SeoCmsContext,
  SeoLandingAnalysisOutput,
} from "./seoAgentLandingTheme";

export interface LandingContentFixInput {
  landingStructure: LandingStructure;
  seoResult: SeoLandingAnalysisOutput;
  seoContext?: SeoCmsContext;
}

export interface LandingContentFixOutput {
  landingStructure: LandingStructure;
}

const SYSTEM_PROMPT = `
You are an expert copywriter and SEO specialist for local beauty service businesses (salons, makeup artists, nail studios).

You receive a landing page CMS structure (JSON) and SEO analysis results.
Your task is to rewrite and improve the content to fix SEO issues and boost conversions.

Rules:
1. Keep the JSON structure EXACTLY the same — only update text content values
2. Do NOT change enabled flags, icons, hrefs, instagram links, image URLs
3. Use local SEO keywords naturally (city + service type) in headlines
4. Make headlines compelling and action-oriented
5. Keep CTA text short and urgent (max 4 words)
6. FAQ answers should be complete (2-3 sentences)
7. Write in Serbian (Latin script) unless content is already in another language
8. Preserve any existing links/hrefs exactly as they are
9. Do NOT rewrite landing sections where enabled is false
10. You may add or improve image alt text, but never change image src values
11. Improve servicesPage and appointmentsPage headline, subheadline and paragraph
12. servicesPage.paragraph and appointmentsPage.paragraph must be one paragraph, max 310 characters with spaces
13. Target a realistic post-fix SEO score of 75-90 for CMS-controllable content
14. Do not make H1/headlines unnaturally long; if the brand or owner wants a short H1, place service + city keywords in subheadline, whereWhatForWhom, page paragraphs, FAQ and alt text
15. Use the provided service catalog and working-hours context as source of truth. Do not invent prices, durations, services or opening hours.
16. Services/prices/durations and booking flow are rendered by platform widgets; improve the supporting copy around those widgets instead of duplicating full catalog data.

Output JSON only — the complete updated landingStructure object.
`;

export async function autoFixLandingContent(
  input: LandingContentFixInput,
): Promise<LandingContentFixOutput> {
  const { landingStructure, seoResult, seoContext } = input;

  const userPrompt = `
Here is the current landing page CMS content:
${JSON.stringify(landingStructure, null, 2)}

Platform context and source-of-truth data:
${JSON.stringify(seoContext ?? {}, null, 2)}

SEO Analysis Result:
Score: ${seoResult.score}/100
Issues: ${seoResult.issues.join("; ")}
Suggestions: ${seoResult.suggestions.join("; ")}
Recommended keywords: ${seoResult.keywords.join(", ")}

Please rewrite the landing page content to fix these SEO issues and improve conversions.
Optimize only CMS-controllable copy. Assume service catalog widgets, price/duration cards, booking calendar, availability and working-hours logic already exist where stated in platform context.
Return the complete updated landingStructure JSON object.
`.trim();

  const messages: DeepSeekMessage[] = [
    { role: "user", content: userPrompt },
  ];

  const response = await callDeepSeek({
    agent: "landingContent",
    messages,
    systemPrompt: SYSTEM_PROMPT,
    jsonMode: true,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Landing content agent error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content)
    throw new Error("No content in landing content agent response");
  if (choice.finish_reason === "length") {
    throw new Error("Landing content auto-fix output was truncated (hit max_tokens).");
  }

  try {
    const parsed = JSON.parse(content);
    // Agent may return the full structure or just the landingStructure key
    const ls: LandingStructure =
      parsed.landingStructure ?? parsed;

    Object.entries(landingStructure.landing).forEach(([key, section]) => {
      if (
        section &&
        typeof section === "object" &&
        "enabled" in section &&
        !(section as { enabled: boolean }).enabled
      ) {
        (ls.landing as unknown as Record<string, unknown>)[key] = section;
      }
    });

    if (ls.pages.servicesPage?.paragraph) {
      ls.pages.servicesPage.paragraph = ls.pages.servicesPage.paragraph.slice(0, 310);
    }
    if (ls.pages.appointmentsPage?.paragraph) {
      ls.pages.appointmentsPage.paragraph =
        ls.pages.appointmentsPage.paragraph.slice(0, 310);
    }

    return { landingStructure: ls };
  } catch (e) {
    throw new Error(`Landing content agent returned invalid JSON: ${e}`);
  }
}

const TYPO_SYSTEM_PROMPT = `
You are a Serbian (Latin script) proofreader for local beauty business landing pages (salons, makeup artists, nail studios).
Return ONLY the complete updated landingStructure JSON, with the exact same shape as the input.
This is SPELLING/TYPO correction ONLY — it is NOT an SEO or content rewrite.

Rules:
- Fix ONLY spelling mistakes, typos, wrong/missing diacritics, doubled or missing letters, and obvious orthographic errors.
- Do NOT rephrase, rewrite, shorten, expand, reorder, translate, or "improve" any text.
- Do NOT change meaning, tone, wording, keywords, SEO, metadata intent or punctuation beyond fixing the typo itself.
- If a word is already correct, leave it byte-for-byte unchanged.
- Preserve ALL non-text values exactly: enabled flags, icons, hrefs, instagram links, image/src URLs and anchors.
- Preserve the exact JSON structure, all keys, and array lengths and order.
- Do NOT rename the salon's own brand/business name; only correct obvious misspellings of common words and of the platform name "Marysoll".
- Keep proper Serbian Latin orthography (e.g. "korišćenje", "ogroman", "č/ć/š/ž/đ").

Output JSON only — the complete updated landingStructure object.
`;

/**
 * Typo-only fix — ispravlja ISKLJUČIVO pravopisne/slovne greške u tenant
 * landing sadržaju, bez SEO prepravke. Ne zahteva prethodnu SEO analizu.
 */
export async function typoFixLandingContent(
  landingStructure: LandingStructure,
): Promise<LandingContentFixOutput> {
  const userPrompt = `
Correct only spelling/typo mistakes in this landing page CMS content and return the complete corrected landingStructure JSON:
${JSON.stringify(landingStructure, null, 2)}
`.trim();

  const response = await callDeepSeek({
    agent: "landingContent",
    messages: [{ role: "user", content: userPrompt }],
    systemPrompt: TYPO_SYSTEM_PROMPT,
    jsonMode: true,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Landing typo-fix agent error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) throw new Error("No content in landing typo-fix agent response");
  if (choice.finish_reason === "length") {
    throw new Error("Landing typo-fix output was truncated (hit max_tokens).");
  }

  try {
    const parsed = JSON.parse(content);
    const ls: LandingStructure = parsed.landingStructure ?? parsed;

    // Ne diraj isključene sekcije — vrati originalne.
    Object.entries(landingStructure.landing).forEach(([key, section]) => {
      if (
        section &&
        typeof section === "object" &&
        "enabled" in section &&
        !(section as { enabled: boolean }).enabled
      ) {
        (ls.landing as unknown as Record<string, unknown>)[key] = section;
      }
    });

    return { landingStructure: ls };
  } catch (e) {
    throw new Error(`Landing typo-fix agent returned invalid JSON: ${e}`);
  }
}
