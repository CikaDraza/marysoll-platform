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
  const content = data.choices?.[0]?.message?.content;
  if (!content)
    throw new Error("No content in landing content agent response");

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
