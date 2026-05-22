import "server-only";

import { callDeepSeek, type DeepSeekMessage } from "../agents";
import type {
  MarketingLandingStructure,
  MarketingSeoAnalysisResult,
} from "@/types/marketing-landing";
import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import { SEO_KNOWLEDGE_BASE } from "@/lib/seo/seoKnowledgeBase";

type PartialAnalysis = {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
};

const OUTPUT_CONTRACT = `
Return ONLY valid JSON:
{
  "score": number,
  "issues": string[],
  "suggestions": string[],
  "keywords": string[]
}
`;

async function runJsonAgent(
  agent: "seoLandingTheme" | "metadataSeo" | "ctaStrategy",
  systemPrompt: string,
  userContent: string,
): Promise<PartialAnalysis> {
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
  return JSON.parse(content) as PartialAnalysis;
}

export async function analyzeMarketingLandingSeo(
  snapshot: LandingRenderSnapshot,
): Promise<MarketingSeoAnalysisResult> {
  const baseContext = JSON.stringify(
    { snapshot, knowledgeBase: SEO_KNOWLEDGE_BASE },
    null,
    2,
  );

  const [landing, metadata, cta] = await Promise.all([
    runJsonAgent(
      "seoLandingTheme",
      `You are a Landing SEO Agent for SaaS marketing pages.
Analyze the rendered snapshot, not raw CMS forms. Focus on heading hierarchy, visible copy, section order, keyword coverage, internal links, pricing content, image alt text and missing content blocks.
If snapshot.source is "rendered-dom", trust headingStructure extracted from real DOM, including Framer Motion tags such as motion.h1/motion.h2. Decorative HTML/CSS/motion elements listed in decorativeElements are not missing images and should not be penalized as image assets.
Use the scoring rubric from the knowledge base. ${OUTPUT_CONTRACT}`,
      `Analyze the landing page snapshot:\n\n${baseContext}`,
    ),
    runJsonAgent(
      "metadataSeo",
      `You are a Metadata SEO Agent for SaaS marketing pages.
Analyze only final metadata: title, description, OG equivalents, canonical and robots. Consider search intent, length, clarity and keyword fit.
Use the scoring rubric from the knowledge base. ${OUTPUT_CONTRACT}`,
      `Analyze metadata from this rendered snapshot:\n\n${baseContext}`,
    ),
    runJsonAgent(
      "ctaStrategy",
      `You are a CTA Strategy Agent for SaaS marketing pages.
Analyze CTA text, CTA hierarchy, internal links, pricing CTAs and conversion path clarity. Do not duplicate generic landing or metadata advice unless it affects CTA strategy.
Use the scoring rubric from the knowledge base. ${OUTPUT_CONTRACT}`,
      `Analyze CTA strategy from this rendered snapshot:\n\n${baseContext}`,
    ),
  ]);

  const score = Math.round(
    landing.score * 0.5 + metadata.score * 0.3 + cta.score * 0.2,
  );

  return {
    score,
    issues: [...landing.issues, ...metadata.issues, ...cta.issues],
    suggestions: [
      ...landing.suggestions,
      ...metadata.suggestions,
      ...cta.suggestions,
    ],
    keywords: Array.from(
      new Set([...landing.keywords, ...metadata.keywords, ...cta.keywords]),
    ),
    sections: { landing, metadata, cta },
  };
}

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
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Marketing landing auto-fix returned no content");
  return JSON.parse(content) as MarketingLandingStructure;
}
