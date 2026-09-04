// Shared validation boundary for content-composer block output.

import {
  LandingPageOutput,
  landingPageOutputSchema,
} from "@/lib/content/schemas/landing-blocks";

export function parseLandingPageOutput(input: unknown): LandingPageOutput {
  const result = landingPageOutputSchema.safeParse(input);

  if (!result.success) {
    throw new Error(`Invalid landing page output: ${result.error.message}`);
  }

  return result.data;
}
