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

import {
  generateEmailTemplate,
} from "./agents/emailTemplateAgent";

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

import {
  generateImage,
} from "./agents/imageAgent";

// ─── Input / Output type map ──────────────────────────────────────────────────

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
      return generateSeoMetadata(
        input as AgentIO["seo"]["input"],
      ) as Promise<AgentIO[K]["output"]>;

    case "image":
      return generateImage(
        (input as AgentIO["image"]["input"]).prompt,
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
export type { LandingPageInput, LandingPageOutput } from "./agents/landingPageAgent";
export type { SeoInput, SeoOutput } from "./agents/seoAgent";
