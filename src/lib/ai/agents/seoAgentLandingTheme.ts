/**
 * lib/ai/agents/seoAgentLandingTheme.ts
 *
 * Analyzes landing page CMS structure for SEO quality.
 * Returns score, issues, suggestions and keyword recommendations.
 *
 * API key: process.env.API_KEY_SEO_LADNING_THEME
 */
import "server-only";

import { callDeepSeek, DeepSeekMessage } from "../agents";
import type { LandingStructure } from "@/types";

export interface SeoLandingAnalysisInput {
  landingStructure: LandingStructure;
}

export interface SeoLandingAnalysisOutput {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
}

export const SYSTEM_PROMPT = `
You are an expert SEO strategist for local service businesses (beauty salons, makeup artists, nail studios).

Analyze landing page content structure and provide:

1. SEO score (0-100)
2. Specific actionable improvements
3. Missing high-intent keywords
4. UX/content issues that affect conversion

SEO Score Badge:
0–50 → red (critical issues)
50–75 → yellow (needs improvement)
75+ → green (good)

Focus on:
- Local SEO (city + service intent)
- Conversion clarity
- Headline strength
- CTA effectiveness
- Content completeness

Be strict and realistic. Do not give generic advice.

Output JSON only:
{
  "score": number,
  "issues": string[],
  "suggestions": string[],
  "keywords": string[]
}
`;

export async function analyzeLandingPageSeo(
  input: SeoLandingAnalysisInput,
): Promise<SeoLandingAnalysisOutput> {
  const { landingStructure } = input;
  const l = landingStructure.landing;

  const contentSummary = `
HERO:
  Headline: ${l.hero.headline || "(empty)"}
  Subheadline: ${l.hero.subheadline || "(empty)"}
  WhereWhatForWhom: ${l.hero.whereWhatForWhom || "(empty)"}
  Location: ${l.hero.contact?.location || "(empty)"}
  Primary CTA: ${l.hero.ctas?.primary?.text || "(empty)"} → ${l.hero.ctas?.primary?.href || "(empty)"}

ABOUT:
  Headline: ${l.about.headline || "(empty)"}
  Paragraphs: ${(l.about.paragraphs ?? []).join(" | ") || "(empty)"}

SERVICES PREVIEW:
  Headline: ${l.servicesPreview.headline || "(empty)"}
  Subheadline: ${l.servicesPreview.subheadline || "(empty)"}

APPOINTMENT SECTION:
  Headline: ${l.appointmentSection.headline || "(empty)"}
  Subheadline: ${l.appointmentSection.subheadline || "(empty)"}
  Instructions: ${(l.appointmentSection.instructions ?? []).map((i) => i.name).join(", ") || "(empty)"}

TESTIMONIALS:
  Headline: ${l.testimonials.headline || "(empty)"}

GALLERY:
  Headline: ${l.gallery.headline || "(empty)"}
  Instagram username: ${l.gallery.instagram?.username || "(empty)"}

FAQ:
  Headline: ${l.faq.headline || "(empty)"}
  Subheadline: ${l.faq.subheadline || "(empty)"}
  Items count: ${(l.faq.items ?? []).length}
  Sample questions: ${(l.faq.items ?? [])
    .slice(0, 3)
    .map((q) => q.question)
    .join(" | ") || "(none)"}

ENABLED SECTIONS: ${Object.entries(l)
    .filter(([, v]) => v && typeof v === "object" && "enabled" in v && (v as { enabled: boolean }).enabled)
    .map(([k]) => k)
    .join(", ")}
  `.trim();

  const messages: DeepSeekMessage[] = [
    {
      role: "user",
      content: `Analyze this landing page content for SEO quality and conversion:\n\n${contentSummary}`,
    },
  ];

  const response = await callDeepSeek({
    agent: "seoLandingTheme",
    messages,
    systemPrompt: SYSTEM_PROMPT,
    jsonMode: true,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SEO landing theme agent error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in SEO landing theme agent response");

  try {
    return JSON.parse(content) as SeoLandingAnalysisOutput;
  } catch (e) {
    throw new Error(`SEO landing theme agent returned invalid JSON: ${e}`);
  }
}
