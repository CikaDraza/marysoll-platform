// hooks/emailCampaign/useGenerateTemplate.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  EmailCampaignContent,
  EmailCampaignTemplate,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

export function useGenerateTemplate() {
  return useMutation<EmailCampaignTemplate, Error, EmailCampaignContent>({
    mutationKey: ["emailCampaign", "template"],
    mutationFn: async (content: EmailCampaignContent) => {
      const res = await api.post<EmailCampaignTemplate>(
        "/admin/email-campaign/template",
        content,
      );
      return res.data;
    },
  });
}
