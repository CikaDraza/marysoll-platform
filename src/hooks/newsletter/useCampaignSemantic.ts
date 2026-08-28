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
import {
  getNewsletterScopeHeaders,
  getNewsletterScopeKey,
  type NewsletterClientScope,
} from "@/lib/newsletter/clientScope";
import { getContentMutationErrorMessage } from "@/lib/newsletter/contentValidationClient";

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
export function useCampaignSemantic(
  scope?: NewsletterClientScope,
): UseCampaignSemanticReturn {
  const queryClient = useQueryClient();
  const scopeKey = getNewsletterScopeKey(scope);
  const requestConfig = { headers: getNewsletterScopeHeaders(scope) };

  // Update basic semantic data
  const updateSemanticMutation = useMutation({
    mutationFn: async ({ campaignId, payload }: UpdateSemanticArgs) => {
      const res = await api.patch(
        `/newsletter/campaigns/${campaignId}/semantic`,
        payload,
        requestConfig,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["newsletterCampaigns", scopeKey],
      });
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
        requestConfig,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["newsletterCampaigns", scopeKey],
      });
      toast.success("Kampanja sačuvana!");
    },
    onError: (err: Error) =>
      toast.error(
        getContentMutationErrorMessage(err, "Greška pri čuvanju kampanje"),
      ),
  });

  return {
    updateSemantic: updateSemanticMutation.mutateAsync,
    saveCampaign: saveCampaignMutation.mutateAsync,
    isSaving:
      updateSemanticMutation.isPending || saveCampaignMutation.isPending,
    error: updateSemanticMutation.error || saveCampaignMutation.error,
  };
}
