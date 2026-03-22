// src/hooks/newsletter/useCampaignSemantic.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  UpdateCampaignSemanticPayload,
  SaveCampaignSemanticPayload,
  UseCampaignSemanticReturn,
} from "@/types/newsletter";

interface UpdateSemanticArgs {
  campaignId: string;
  payload: UpdateCampaignSemanticPayload;
}

interface SaveCampaignArgs {
  campaignId: string;
  payload: SaveCampaignSemanticPayload;
}

/**
 * Hook za upravljanje semantic podacima kampanje
 */
export function useCampaignSemantic(): UseCampaignSemanticReturn {
  const queryClient = useQueryClient();

  // Update basic semantic data
  const updateSemanticMutation = useMutation({
    mutationFn: async ({ campaignId, payload }: UpdateSemanticArgs) => {
      const res = await api.patch(
        `/newsletter/campaigns/${campaignId}/semantic`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Semantic podaci sačuvani");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Save campaign with layout and SEO (status: "generated")
  const saveCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, payload }: SaveCampaignArgs) => {
      const res = await api.patch(
        `/newsletter/campaigns/${campaignId}/save`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletterCampaigns"] });
      toast.success("Kampanja sačuvana!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    updateSemantic: updateSemanticMutation.mutateAsync,
    saveCampaign: saveCampaignMutation.mutateAsync,
    isSaving:
      updateSemanticMutation.isPending || saveCampaignMutation.isPending,
    error: updateSemanticMutation.error || saveCampaignMutation.error,
  };
}
