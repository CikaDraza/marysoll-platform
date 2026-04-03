// hooks/emailCampaign/useGenerateContent.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  EmailCampaignContent,
  EmailCampaignStrategy,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

export function useGenerateContent() {
  return useMutation<EmailCampaignContent, Error, EmailCampaignStrategy>({
    mutationKey: ["emailCampaign", "content"],
    mutationFn: async (strategy: EmailCampaignStrategy) => {
      const res = await api.post<EmailCampaignContent>(
        "/admin/email-campaign/content",
        strategy,
      );
      return res.data;
    },
  });
}
