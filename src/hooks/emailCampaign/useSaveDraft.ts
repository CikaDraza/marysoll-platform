"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  EmailCampaignContent,
  EmailCampaignOptimization,
  EmailCampaignStrategy,
  EmailCampaignTemplate,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

export interface SaveDraftInput {
  campaignId?: string;
  salonProfileId: string;
  salonName?: string;
  topic: string;
  audience?: string;
  tone: string;
  strategy?: EmailCampaignStrategy;
  content?: EmailCampaignContent;
  template?: EmailCampaignTemplate;
  optimization?: EmailCampaignOptimization;
}

export interface SaveDraftResult {
  campaignId: string;
  status: "draft";
}

export function useSaveDraft() {
  return useMutation<SaveDraftResult, Error, SaveDraftInput>({
    mutationKey: ["emailCampaign", "saveDraft"],
    mutationFn: async (input) => {
      const res = await api.post<SaveDraftResult>("/campaigns/draft", input);
      return res.data;
    },
  });
}
