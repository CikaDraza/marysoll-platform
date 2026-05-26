// src/hooks/usePublishLanding.ts
"use client";

import { api } from "@/lib/api";
import {
  CampaignLandingContent,
  CampaignSemanticType,
} from "@/types/conversational/campaign";
import { LandingBlock } from "@/types/landing-blocks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

type PublishLandingInput = {
  campaignId: string;
  payload: {
    layout: LandingBlock[];
    semanticType: CampaignSemanticType;
    generatedAt: string;
    status: string;
    seo: CampaignLandingContent["seo"];
    score?: number;
  };
};

export function usePublishLanding() {
  const queryClient = useQueryClient();

  const publishLanding = useMutation({
    mutationFn: async ({ campaignId, payload }: PublishLandingInput) => {
      const res = await api.patch(
        `/newsletter/campaigns/${campaignId}/publish`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Landing uspešno objavljen!");
    },
  });

  return {
    publishLanding,
    isPublishing: publishLanding.isPending,
    error: publishLanding.error,
  };
}
