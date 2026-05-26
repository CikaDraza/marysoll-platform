// lib/ai/agents/landingPageAgent.ts
import "server-only";

import { LandingPageOutput } from "@/types/landing-blocks";
import { parseLandingPageOutput } from "@/lib/conversational/editor/aiToLayoutAdapter";
import { getLandingClient } from "../providers/deepseek";

export type { LandingPageOutput } from "@/types/landing-blocks";

export interface LandingPageInput {
  campaignType: string;
  semanticContent: {
    intent: string;
    summary: string;
    tone: string;
  };
  customPrompt: string;
  imagesUrl?: string[];
}

const outputContract = `{
  "blocks": [
    {
      "id": "hero",
      "type": "HeroBlock",
      "priority": 1,
      "title": "H1 naslov",
      "subtitle": "Opcioni podnaslov",
      "ctaLabel": "Opciona CTA labela",
      "href": "Opcioni URL",
      "images": [{ "src": "URL iz IMAGES_URL", "alt": "Opis slike" }]
    },
    {
      "id": "article-1",
      "type": "ArticleBlock",
      "priority": 2,
      "title": "H2 naslov",
      "paragraphs": ["Pasus 1", "Pasus 2"],
      "image": { "src": "URL iz IMAGES_URL", "alt": "Opis slike" }
    },
    {
      "id": "features",
      "type": "FeatureBlock",
      "priority": 3,
      "title": "H2 naslov",
      "intro": "Opcioni uvod",
      "sections": [
        {
          "title": "H3 naslov",
          "paragraphs": ["Pasus"],
          "items": ["Opciona stavka"],
          "image": { "src": "URL iz IMAGES_URL", "alt": "Opis slike" }
        }
      ]
    },
    {
      "id": "content-split",
      "type": "ContentSplitBlock",
      "priority": 4,
      "title": "H2 naslov",
      "content": "Tekst sekcije",
      "image": { "src": "URL iz IMAGES_URL", "alt": "Opis slike" },
      "reverse": false
    },
    {
      "id": "pricing",
      "type": "PricingBlock",
      "priority": 5,
      "title": "H2 naslov",
      "description": "Opcioni opis",
      "items": [
        {
          "title": "Naziv paketa",
          "description": "Opis paketa",
          "price": { "amount": 1200, "currency": "RSD" },
          "features": ["Stavka"],
          "href": "/termini",
          "ctaLabel": "Zakaži",
          "highlight": "none"
        }
      ]
    },
    {
      "id": "final-cta",
      "type": "AffiliateCTABlock",
      "priority": 6,
      "eyebrow": "Opcioni eyebrow",
      "title": "H2 CTA naslov",
      "description": "Opcioni opis",
      "ctaLabel": "CTA labela",
      "href": "/termini",
      "image": { "src": "URL iz IMAGES_URL", "alt": "Opis slike" }
    }
  ]
}`;

function collectImageSources(output: LandingPageOutput) {
  const sources: string[] = [];

  for (const block of output.blocks) {
    switch (block.type) {
      case "HeroBlock":
        sources.push(...(block.images?.map((image) => image.src) || []));
        break;
      case "ArticleBlock":
      case "ContentSplitBlock":
      case "AffiliateCTABlock":
        if (block.image) sources.push(block.image.src);
        break;
      case "FeatureBlock":
        for (const section of block.sections) {
          if (section.image) sources.push(section.image.src);
        }
        break;
      case "PricingBlock":
        break;
      default: {
        const _exhaustive: never = block;
        return _exhaustive;
      }
    }
  }

  return sources;
}

function assertAllowedImageSources(
  output: LandingPageOutput,
  allowedSources: readonly string[],
) {
  const allowed = new Set(allowedSources);
  const invalid = collectImageSources(output).filter((src) => !allowed.has(src));

  if (invalid.length > 0) {
    throw new Error("Landing output contains image URLs outside IMAGES_URL input");
  }
}

export async function generateLandingPreview(
  input: LandingPageInput,
): Promise<LandingPageOutput> {
  const { semanticContent, customPrompt, imagesUrl } = input;

  const imagesSection =
    imagesUrl && imagesUrl.length > 0
      ? imagesUrl.map((url, i) => `${i + 1}. ${url}`).join("\n")
      : "Nema slika";

  const systemPrompt = `Ti si senior landing page strategist za newsletter campaign landing/blog stranice.
Tvoj zadatak je da generišeš SEO-ready semantic content tree.

Vrati validan JSON samo u ovom obliku:
${outputContract}

Pravila:
- Return valid JSON only.
- Do not return markdown.
- Do not return HTML.
- Do not use retired legacy landing block names.
- Allowed block types only: HeroBlock, ArticleBlock, FeatureBlock, ContentSplitBlock, PricingBlock, AffiliateCTABlock.
- HeroBlock is the only H1.
- ArticleBlock uses H2 + paragraphs.
- FeatureBlock uses H2 + H3 sections + paragraphs + optional ul items.
- ContentSplitBlock is optional.
- PricingBlock is optional and only when prices, services or packages are relevant.
- AffiliateCTABlock should be the final CTA when there is a promoted action or link.
- Use images only from IMAGES_URL input.
- Do not invent image URLs.
- Every image must have alt text.
- Bez emoji-ja.
- Ukupna dužina teksta treba da bude adekvatna za premium landing/blog stranicu.`;

  const userPrompt = `
KORISNIČKI ZAHTEV: ${customPrompt}
IMAGES_URL: ${imagesSection}
SEMANTIČKI KONTEKST:
Svrha: ${semanticContent.intent}
Opis: ${semanticContent.summary}
Ton: ${semanticContent.tone}
`;

  const client = getLandingClient();

  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content returned from DeepSeek");
  }

  try {
    const parsed = parseLandingPageOutput(JSON.parse(content));
    assertAllowedImageSources(parsed, imagesUrl || []);
    return parsed;
  } catch (error) {
    console.error("Failed to parse DeepSeek response:", content);
    throw new Error(`Invalid landing JSON from DeepSeek: ${error}`);
  }
}
