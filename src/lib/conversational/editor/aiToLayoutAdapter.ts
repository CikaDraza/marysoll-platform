// lib/conversational/editor/aiToLayoutAdapter.ts

import {
  LandingBlock,
  LandingPageOutput,
  landingPageOutputSchema,
} from "@/types/landing-blocks";

export function parseLandingPageOutput(input: unknown): LandingPageOutput {
  const result = landingPageOutputSchema.safeParse(input);

  if (!result.success) {
    throw new Error(`Invalid landing page output: ${result.error.message}`);
  }

  return result.data;
}

function parseLandingBlocks(input: unknown): LandingBlock[] {
  return parseLandingPageOutput(input).blocks;
}

