"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CampaignStatus } from "@/models/EmailCampaign";
import type { CampaignRow } from "@/components/campaigns/CampaignTable";

export function useCampaigns(status: CampaignStatus) {
  return useQuery<CampaignRow[]>({
    queryKey: ["campaigns", status],
    queryFn: async () => {
      const res = await api.get<{ campaigns: CampaignRow[] }>(
        `/campaigns?status=${status}`,
      );
      return res.data.campaigns;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery<CampaignRow>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await api.get<{ campaign: CampaignRow }>(`/campaigns/${id}`);
      return res.data.campaign;
    },
    enabled: !!id,
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/campaigns/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useScheduleCampaignFromList() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { campaignId: string; sendAt: string }
  >({
    mutationFn: async ({ campaignId, sendAt }) => {
      await api.post("/campaigns/schedule", { campaignId, sendAt });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
