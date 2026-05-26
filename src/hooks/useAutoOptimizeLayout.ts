import { useCallback, useRef, useState } from "react";
import { sanitizeLayout } from "@/lib/conversational/editor/sanitizeLayout";
import { scoreLayout } from "@/lib/conversational/layout-engine/scoreLayout";
import {
  BuildCampaignLayoutResult,
  CampaignSemanticType,
} from "@/types/conversational/campaign";
import { INewsletterCampaign } from "@/types";
import { CampaignIntent } from "@/types/conversational/campaign";
import { LandingBlock } from "@/types/landing-blocks";

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

export function useAutoOptimizeLayout({ form, aiLanding }: Params) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const runIdRef = useRef(0);

  const generateVariant = useCallback((): BuildCampaignLayoutResult | null => {
    const blocks = aiLanding.layout || aiLanding.blocks || [];
    if (blocks.length === 0) return null;

    const layout = sanitizeLayout(blocks);
    const score = scoreLayout(layout);

    return {
      layout,
      preview: layout.map((block) => ({
        id: block.id,
        type: block.type,
        priority: block.priority,
        visibility: block.visibility,
      })),
      score,
      meta: {
        semanticType: form.semanticContent.intent as CampaignSemanticType,
        usedDefaults: false,
        generatedAt: new Date(),
      },
    };
  }, [form.semanticContent.intent, aiLanding]);

  const optimize = useCallback(async () => {
    const blocks = aiLanding?.layout || aiLanding?.blocks || [];
    if (blocks.length === 0) return null;

    const runId = ++runIdRef.current;
    setIsOptimizing(true);

    try {
      const variant = generateVariant();
      if (runId !== runIdRef.current) return null;

      return variant;
    } finally {
      if (runId === runIdRef.current) setIsOptimizing(false);
    }
  }, [generateVariant, aiLanding]);

  return {
    optimize,
    isOptimizing,
  };
}
