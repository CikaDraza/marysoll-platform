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

export interface AudienceSegmentRow {
  _id: string;
  name: string;
  estimatedCount: number;
  filters: {
    roles?: string[];
    tags?: string[];
    subscribed?: boolean;
    lastVisitDays?: number;
  };
}

export interface CampaignRecipient {
  email: string;
  name?: string;
}

export interface CampaignRecipientsResult {
  count: number;
  recipients: CampaignRecipient[];
  source: "sent" | "preview";
}

export function useCampaignRecipients(id: string, enabled: boolean) {
  return useQuery<CampaignRecipientsResult>({
    queryKey: ["campaign-recipients", id],
    queryFn: async () => {
      const res = await api.get<CampaignRecipientsResult>(`/campaigns/${id}/recipients`);
      return res.data;
    },
    enabled: !!id && enabled,
  });
}

export function useAudienceSegments() {
  return useQuery<AudienceSegmentRow[]>({
    queryKey: ["audience-segments"],
    queryFn: async () => {
      const res = await api.get<{ segments: AudienceSegmentRow[] }>("/audience-segments");
      return res.data.segments;
    },
  });
}

export function useUpdateCampaignAudience(campaignId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string | null>({
    mutationFn: async (audienceSegmentId) => {
      await api.patch(`/campaigns/${campaignId}`, { audienceSegmentId: audienceSegmentId ?? null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });
}

export interface AudienceContactRow {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  subscribed: boolean;
  contactType: string;
}

export function useAudienceContacts() {
  return useQuery<AudienceContactRow[]>({
    queryKey: ["audience-contacts"],
    queryFn: async () => {
      const res = await api.get<{ contacts: AudienceContactRow[] }>("/audience-contacts");
      return res.data.contacts;
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
