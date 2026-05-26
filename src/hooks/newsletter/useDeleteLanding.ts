// src/hooks/newsletter/useDeleteLanding.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  getNewsletterScopeHeaders,
  getNewsletterScopeKey,
  type NewsletterClientScope,
} from "@/lib/newsletter/clientScope";

/**
 * Hook za brisanje landing page-a iz kampanje
 */
export function useDeleteLanding(
  campaignId: string,
  scope?: NewsletterClientScope,
) {
  const queryClient = useQueryClient();
  const scopeKey = getNewsletterScopeKey(scope);
  const requestConfig = { headers: getNewsletterScopeHeaders(scope) };

  const mutation = useMutation({
    mutationKey: ["delete-landing", campaignId],
    mutationFn: async () => {
      const res = await api.delete(
        `/newsletter/campaigns/${campaignId}/landing`,
        requestConfig,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["newsletterCampaigns", scopeKey],
      });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      toast.success("Landing obrisan!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    deleteLanding: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}
