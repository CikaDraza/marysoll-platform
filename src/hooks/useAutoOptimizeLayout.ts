// src/hooks/useAutoOptimizeLayout.ts
import { useCallback, useRef, useState } from "react";
import { buildCampaignLayout } from "@/lib/conversational/editor/buildCampaignLayout";
import {
  BuildCampaignLayoutResult,
  CampaignSemanticType,
} from "@/types/conversational/campaign";
import { INewsletterCampaign } from "@/types";
import { CampaignIntent } from "@/types/conversational/campaign";
import { LandingBlock } from "@/types/landing-blocks";
import { AICampaignResponse } from "@/types/conversational/ai-preview";

// Fleksibilniji tipovi koji podržavaju oba slučaja
interface SemanticContentInput {
  intent: string | CampaignIntent;
  summary?: string;
  tone?: string;
  status?: string;
  source?: string;
}

interface FormInput {
  campaignType: "email-only" | "email-landing";
  semanticContent: SemanticContentInput;
  landingPage?: {
    enabled?: boolean;
    slug?: string;
  };
}

interface LandingInput {
  layout?: LandingBlock[];
  blocks?: LandingBlock[];
  seo?: Record<string, unknown>;
  score?: { total: number; breakdown: Record<string, number> } | number;
  meta?: {
    semanticType?: string;
    generatedAt?: Date;
  };
}

interface Params {
  campaign: INewsletterCampaign;
  form: FormInput;
  aiLanding: LandingInput;
}

/**
 * Konvertuje LandingInput u format koji buildCampaignLayout očekuje
 */
function toLandingResponse(landing: LandingInput): AICampaignResponse | null {
  const blocks = landing.layout || landing.blocks || [];

  if (blocks.length === 0) return null;

  // Izvuci podatke iz blokova
  const heroBlock = blocks.find((b) => b.type === "HeroPrimaryBlock");
  const heroVisualBlock = blocks.find((b) => b.type === "HeroVisualBlock");
  const articleBlock = blocks.find((b) => b.type === "ArticleSectionBlock");
  const contentSplitBlock = blocks.find((b) => b.type === "ContentSplitBlock");
  const featuresBlock = blocks.find((b) => b.type === "FeatureGridBlock");

  return {
    hero: heroBlock
      ? { title: heroBlock.title || "", subtitle: heroBlock.subtitle }
      : { title: "", subtitle: "" },
    heroVisual: heroVisualBlock
      ? {
          title: heroVisualBlock.title || "",
          subtitle: heroVisualBlock.subtitle,
          imagesUrl: heroVisualBlock.imagesUrl || [],
        }
      : { title: "", subtitle: "", imagesUrl: [] },
    article: articleBlock
      ? { title: articleBlock.title || "", content: articleBlock.content || "" }
      : { title: "", content: "" },
    contentSplit: contentSplitBlock
      ? {
          heading: contentSplitBlock.heading || "",
          content: contentSplitBlock.content || "",
        }
      : { heading: "", content: "" },
    features: featuresBlock?.features || [],
  };
}

export function useAutoOptimizeLayout({ campaign, form, aiLanding }: Params) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const runIdRef = useRef(0);

  const generateVariant = useCallback(
    (): BuildCampaignLayoutResult | null => {
      const landingResponse = toLandingResponse(aiLanding);

      if (!landingResponse) return null;

      const result = buildCampaignLayout(
        landingResponse,
        campaign,
        form.semanticContent.intent as string,
      );

      return {
        ...result,
        preview: result.layout.map((block) => ({
          id: block.id,
          type: block.type,
          priority: block.priority,
        })),
        meta: {
          ...result.meta,
          semanticType: result.meta.semanticType as CampaignSemanticType,
          usedDefaults: false,
        },
      };
    },
    [campaign, form.semanticContent.intent, aiLanding],
  );

  const optimize = useCallback(async () => {
    const blocks = aiLanding?.layout || aiLanding?.blocks || [];
    if (blocks.length === 0) return null;

    const runId = ++runIdRef.current;
    setIsOptimizing(true);

    try {
      const variants = await Promise.all([
        Promise.resolve(generateVariant()),
        Promise.resolve(generateVariant()),
        Promise.resolve(generateVariant()),
      ]);

      if (runId !== runIdRef.current) return null;

      // Filtriraj null vrednosti
      const validVariants = variants.filter(
        (v): v is BuildCampaignLayoutResult => v !== null,
      );

      if (validVariants.length === 0) return null;

      const best = validVariants.sort(
        (a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0),
      )[0];

      return best;
    } finally {
      if (runId === runIdRef.current) setIsOptimizing(false);
    }
  }, [generateVariant, aiLanding]);

  return {
    optimize,
    isOptimizing,
  };
}
