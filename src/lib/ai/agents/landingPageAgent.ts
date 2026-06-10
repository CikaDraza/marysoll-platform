// lib/ai/agents/landingPageAgent.ts
import "server-only";

import {
  LandingPageOutput,
  type LandingPageAiOutput,
  landingPageAiOutputSchema,
} from "@/types/landing-blocks";
import { parseLandingPageOutput } from "@/lib/conversational/editor/aiToLayoutAdapter";
import { getLandingClient } from "../providers/deepseek";
import { resolveCta, ctaCatalogPromptList } from "../landing/ctaCatalog";

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
      "ctaLabel": "Opciona CTA labela (vidljivi tekst dugmeta)",
      "ctaKey": "start-free",
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
          "ctaKey": "plan-claudia",
          "ctaLabel": "Izaberi plan",
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
      "ctaKey": "start-free",
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

function stripNullImages(obj: unknown): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(stripNullImages);
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const key of ["image", "images"]) {
    if (key in record && record[key] == null) {
      delete record[key];
    }
  }
  if (Array.isArray(record.sections)) {
    record.sections.forEach(stripNullImages);
  }
  if (Array.isArray(record.blocks)) {
    record.blocks.forEach(stripNullImages);
  }
}

/**
 * Resolver/validator: maps each block's `ctaKey` to a curated destination from
 * the CTA catalog (allowlist). `href` is always taken from the catalog — the
 * agent can never inject a raw URL — while `ctaLabel` keeps the agent's copy
 * (falling back to the catalog label). Unknown keys fall back to the default.
 */
function resolveLandingCtas(output: LandingPageAiOutput): LandingPageOutput {
  const blocks = output.blocks.map((block) => {
    switch (block.type) {
      case "HeroBlock": {
        // Hero CTA is optional — only resolve when the agent signalled a button.
        if (!block.ctaKey && !block.ctaLabel) return block;
        const cta = resolveCta(block.ctaKey);
        return {
          ...block,
          ctaKey: cta.key,
          href: cta.href,
          ctaLabel: block.ctaLabel || cta.label,
        };
      }
      case "AffiliateCTABlock": {
        // Final CTA always renders a button.
        const cta = resolveCta(block.ctaKey);
        return {
          ...block,
          ctaKey: cta.key,
          href: cta.href,
          ctaLabel: block.ctaLabel || cta.label,
        };
      }
      case "PricingBlock": {
        return {
          ...block,
          items: block.items.map((item) => {
            if (!item.ctaKey && !item.ctaLabel) return item;
            const cta = resolveCta(item.ctaKey);
            return {
              ...item,
              ctaKey: cta.key,
              href: cta.href,
              ctaLabel: item.ctaLabel || cta.label,
            };
          }),
        };
      }
      default:
        return block;
    }
  });

  // Strict re-validation; `href` is now guaranteed where the schema requires it.
  return parseLandingPageOutput({ blocks });
}

export async function generateLandingPreview(
  input: LandingPageInput,
): Promise<LandingPageOutput> {
  const { semanticContent, customPrompt, imagesUrl } = input;

  const imagesSection =
    imagesUrl && imagesUrl.length > 0
      ? imagesUrl.map((url, i) => `${i + 1}. ${url}`).join("\n")
      : "Nema slika";

  const hasImages = imagesUrl && imagesUrl.length > 0;

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
- CTA buttons: NEVER output a raw URL or "href". For every button choose a "ctaKey" from the allowed catalog below.
- "ctaLabel" is the visible button copy — write short, compelling Serbian (Latin) copy (max 4 words).
- Pick the most relevant ctaKey for the context; default to "start-free" if unsure. For PricingBlock items choose the matching "plan-*" key.
- Allowed ctaKey values:
${ctaCatalogPromptList()}
- Use images only from IMAGES_URL input.
- Do not invent image URLs.
- Every image must have alt text.${hasImages ? "" : "\n- IMAGES_URL is empty: do NOT include any image or images field in any block. Omit the field entirely."}
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
    const raw = JSON.parse(content);
    stripNullImages(raw);
    const aiOutput = landingPageAiOutputSchema.parse(raw);
    const resolved = resolveLandingCtas(aiOutput);
    assertAllowedImageSources(resolved, imagesUrl || []);
    return resolved;
  } catch (error) {
    console.error("Failed to parse DeepSeek response:", content);
    throw new Error(`Invalid landing JSON from DeepSeek: ${error}`);
  }
}
