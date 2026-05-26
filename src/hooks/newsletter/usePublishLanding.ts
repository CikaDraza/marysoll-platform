// src/hooks/newsletter/usePublishLanding.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  PublishLandingPayload,
  UsePublishLandingReturn,
} from "@/types/newsletter";
import {
  getNewsletterScopeHeaders,
  getNewsletterScopeKey,
  type NewsletterClientScope,
} from "@/lib/newsletter/clientScope";

interface PublishLandingArgs {
  campaignId: string;
  payload: PublishLandingPayload;
}

/**
 * Hook za objavljivanje landing page-a (status: "published")
 */
export function usePublishLanding(
  scope?: NewsletterClientScope,
): UsePublishLandingReturn {
  const queryClient = useQueryClient();
  const scopeKey = getNewsletterScopeKey(scope);
  const requestConfig = { headers: getNewsletterScopeHeaders(scope) };

  const mutation = useMutation({
    mutationFn: async ({ campaignId, payload }: PublishLandingArgs) => {
      const res = await api.patch(
        `/newsletter/campaigns/${campaignId}/publish`,
        payload,
        requestConfig,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["newsletterCampaigns", scopeKey],
      });
      toast.success("Landing uspešno objavljen!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    publishLanding: mutation.mutateAsync,
    isPublishing: mutation.isPending,
    error: mutation.error,
  };
}
