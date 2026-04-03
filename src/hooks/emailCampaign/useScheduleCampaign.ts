"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ScheduleCampaignInput {
  campaignId: string;
  sendAt: string; // ISO date string
}

export interface ScheduleCampaignResult {
  campaignId: string;
  status: "scheduled";
  sendAt: string;
}

export function useScheduleCampaign() {
  return useMutation<ScheduleCampaignResult, Error, ScheduleCampaignInput>({
    mutationKey: ["emailCampaign", "schedule"],
    mutationFn: async (input) => {
      const res = await api.post<ScheduleCampaignResult>(
        "/campaigns/schedule",
        input,
      );
      return res.data;
    },
  });
}
