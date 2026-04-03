// hooks/emailCampaign/useGenerateStrategy.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  EmailCampaignStrategy,
  EmailCampaignTone,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

export interface GenerateStrategyInput {
  salonIds: string[];
  topic: string;
  audience?: string;
  tone: EmailCampaignTone;
  useAverage: boolean;
}

export function useGenerateStrategy() {
  return useMutation<EmailCampaignStrategy, Error, GenerateStrategyInput>({
    mutationKey: ["emailCampaign", "strategy"],
    mutationFn: async (input: GenerateStrategyInput) => {
      const res = await api.post<EmailCampaignStrategy>(
        "/admin/email-campaign/strategy",
        input,
      );
      return res.data;
    },
  });
}
