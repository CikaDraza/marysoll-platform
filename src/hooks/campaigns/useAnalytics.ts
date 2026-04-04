"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CampaignTimelinePoint {
  date: string;
  opens: number;
  clicks: number;
}

export interface AbVariant {
  id: "A" | "B";
  subject: string;
  sent: number;
  opened: number;
  openRate: number;
}

export interface CampaignAnalyticsData {
  campaign: {
    topic: string;
    subject: string;
    salonName: string;
    status: string;
    sentAt?: string;
    createdAt: string;
  };
  metrics: {
    recipients: number;
    delivered: number;
    opens: number;
    clicks: number;
    openRate: number;
    clickRate: number;
  };
  timeline: CampaignTimelinePoint[];
  abTest: {
    variants: AbVariant[];
    winnerId: "A" | "B";
  } | null;
}

export interface AnalyticsCampaignRow {
  id: string;
  topic: string;
  subject: string;
  sentAt?: string;
  hasAbTest: boolean;
  metrics: {
    recipients: number;
    delivered: number;
    opens: number;
    clicks: number;
    openRate: number;
    clickRate: number;
  };
}

export interface AnalyticsTrendPoint {
  month: string;
  campaigns: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalRecipients: number;
}

export interface AggregatedAnalyticsData {
  summary: {
    totalCampaigns: number;
    avgOpenRate: number;
    avgClickRate: number;
    totalRecipients: number;
  };
  campaigns: AnalyticsCampaignRow[];
  trend: AnalyticsTrendPoint[];
}

export function useCampaignAnalytics(campaignId: string) {
  return useQuery<CampaignAnalyticsData>({
    queryKey: ["campaign-analytics", campaignId],
    queryFn: async () => {
      const res = await api.get<CampaignAnalyticsData>(
        `/campaigns/${campaignId}/analytics`,
      );
      return res.data;
    },
    enabled: !!campaignId,
    staleTime: 60_000,
  });
}

export function useAggregatedAnalytics() {
  return useQuery<AggregatedAnalyticsData>({
    queryKey: ["campaigns-analytics"],
    queryFn: async () => {
      const res = await api.get<AggregatedAnalyticsData>("/campaigns/analytics");
      return res.data;
    },
    staleTime: 60_000,
  });
}
