// hooks/emailCampaign/useOptimizeCampaign.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  EmailCampaignContent,
  EmailCampaignOptimization,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

export function useOptimizeCampaign() {
  return useMutation<EmailCampaignOptimization, Error, EmailCampaignContent>({
    mutationKey: ["emailCampaign", "optimization"],
    mutationFn: async (content: EmailCampaignContent) => {
      const res = await api.post<EmailCampaignOptimization>(
        "/admin/email-campaign/optimize",
        content,
      );
      return res.data;
    },
  });
}
