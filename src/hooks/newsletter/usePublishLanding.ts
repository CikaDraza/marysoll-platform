// src/hooks/newsletter/usePublishLanding.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  PublishLandingPayload,
  UsePublishLandingReturn,
} from "@/types/newsletter";

interface PublishLandingArgs {
  campaignId: string;
  payload: PublishLandingPayload;
}

/**
 * Hook za objavljivanje landing page-a (status: "published")
 */
export function usePublishLanding(): UsePublishLandingReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ campaignId, payload }: PublishLandingArgs) => {
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
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    publishLanding: mutation.mutateAsync,
    isPublishing: mutation.isPending,
    error: mutation.error,
  };
}
