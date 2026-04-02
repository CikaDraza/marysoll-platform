/**
 * lib/ai/orchestrator.ts
 *
 * Central AI orchestrator. Single entry point for all AI operations.
 * All business logic lives in the individual agent files; this file
 * only dispatches and re-exports types.
 *
 * Usage:
 *   import { runAgent } from "@/lib/ai/orchestrator";
 *   const html = await runAgent("emailTemplate", { prompt: "..." });
 */
import "server-only";

import { generateEmailTemplate } from "./agents/emailTemplateAgent";

import {
  generateLandingPreview,
  type LandingPageInput,
  type LandingPageOutput,
} from "./agents/landingPageAgent";

import {
  generateSeoMetadata,
  type SeoInput,
  type SeoOutput,
} from "./agents/seoAgent";

import { generateImage } from "./agents/imageAgent";
import {
  EmailCampaignContent,
  EmailCampaignInput,
  EmailCampaignOptimization,
  EmailCampaignStrategy,
  EmailCampaignTemplate,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";
import { generateCampaignContent } from "./agents/emailCampaign/campaignContentAgent";
import { generateCampaignTemplate } from "./agents/emailCampaign/campaignTemplateAgent";
import { generateCampaignOptimization } from "./agents/emailCampaign/campaignOptimizationAgent";
import { CampaignAnalytics } from "@/models/CampaignAnalytics";
import { generateCampaignStrategy } from "./agents/emailCampaign/campaignStrategistAgent";

// ─── Input / Output type map ──────────────────────────────────────────────────
interface EmailCampaignStrategistInput extends EmailCampaignInput {
  tenantId: string;
  campaignId?: string;
  useAverage: boolean;
}

interface AgentIO {
  emailTemplate: {
    input: { prompt: string };
    output: string; // HTML string
  };
  landingPage: {
    input: LandingPageInput;
    output: LandingPageOutput;
  };
  seo: {
    input: SeoInput;
    output: SeoOutput;
  };
  image: {
    input: { prompt: string };
    output: { optimizedPrompt: string; base64Image: string };
  };
  campaignStrategy: {
    input: EmailCampaignStrategistInput;
    output: EmailCampaignStrategy;
  };
  campaignContent: {
    input: EmailCampaignStrategy;
    output: EmailCampaignContent;
  };
  campaignTemplate: {
    input: EmailCampaignContent;
    output: EmailCampaignTemplate;
  };
  campaignOptimization: {
    input: EmailCampaignContent;
    output: EmailCampaignOptimization;
  };
}

type AgentName = keyof AgentIO;

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export async function runAgent<K extends AgentName>(
  agent: K,
  input: AgentIO[K]["input"],
): Promise<AgentIO[K]["output"]> {
  switch (agent) {
    case "emailTemplate":
      return generateEmailTemplate(
        (input as AgentIO["emailTemplate"]["input"]).prompt,
      ) as Promise<AgentIO[K]["output"]>;

    case "landingPage":
      return generateLandingPreview(
        input as AgentIO["landingPage"]["input"],
      ) as Promise<AgentIO[K]["output"]>;

    case "seo":
      return generateSeoMetadata(input as AgentIO["seo"]["input"]) as Promise<
        AgentIO[K]["output"]
      >;

    case "image":
      return generateImage(
        (input as AgentIO["image"]["input"]).prompt,
      ) as Promise<AgentIO[K]["output"]>;

    case "campaignStrategy": {
      const inputTyped = input as AgentIO["campaignStrategy"]["input"];
      const useAverage = inputTyped.useAverage ?? false; // Panel flag: default false = last campaign

      // Projection: uzimamo samo ono što nam treba
      const analytics = await CampaignAnalytics.findOne(
        { tenantId: inputTyped.tenantId },
        useAverage
          ? { avgOpenRate: 1, avgClickRate: 1, topTopics: 1 } // samo prosečne metrike
          : { campaignHistory: { $slice: -1 } }, // poslednja kampanja
      ).lean();

      let analyticsSummary: string | undefined;

      if (analytics) {
        if (useAverage) {
          // Avg metrics
          analyticsSummary = `Avg open rate: ${(
            analytics.avgOpenRate * 100
          ).toFixed(1)}%, Avg click rate: ${(
            analytics.avgClickRate * 100
          ).toFixed(1)}%, Top topics: ${analytics.topTopics.join(", ")}`;
        } else {
          // Last campaign metrics
          const lastCampaign = analytics.campaignHistory?.[0];
          if (lastCampaign) {
            analyticsSummary = `Open rate: ${(
              lastCampaign.openRate * 100
            ).toFixed(1)}%, Click rate: ${(
              lastCampaign.clickRate * 100
            ).toFixed(
              1,
            )}%, Subject line: ${lastCampaign.subjectLine}, Topic: ${lastCampaign.topic}`;
          }
        }
      }

      return generateCampaignStrategy({
        ...inputTyped,
        analyticsSummary,
      }) as Promise<AgentIO[K]["output"]>;
    }

    case "campaignContent":
      return generateCampaignContent(
        input as AgentIO["campaignContent"]["input"],
      ) as Promise<AgentIO[K]["output"]>;

    case "campaignTemplate":
      return generateCampaignTemplate(
        input as AgentIO["campaignTemplate"]["input"],
      ) as Promise<AgentIO[K]["output"]>;

    case "campaignOptimization":
      return generateCampaignOptimization(
        input as AgentIO["campaignOptimization"]["input"],
      ) as Promise<AgentIO[K]["output"]>;

    default:
      throw new Error(`Unknown agent: ${agent}`);
  }
}

// Re-export individual agents for direct use when orchestrator overhead isn't needed
export { generateEmailTemplate } from "./agents/emailTemplateAgent";
export { generateLandingPreview } from "./agents/landingPageAgent";
export { generateSeoMetadata } from "./agents/seoAgent";
export { generateImage } from "./agents/imageAgent";
export type {
  LandingPageInput,
  LandingPageOutput,
} from "./agents/landingPageAgent";
export type { SeoInput, SeoOutput } from "./agents/seoAgent";

export {
  generateCampaignContent,
  generateCampaignTemplate,
  generateCampaignOptimization,
};
