"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { api } from "@/lib/api";
import type { PlanFeatures, PlanName } from "@/lib/plans/planFeatures";

export interface PlanStatusData {
  name: string;
  plan: PlanName;
  status: "active" | "suspended" | "pending" | "cancelled";
  isTrialActive: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  aiSettings: {
    chatEnabled: boolean;
    landingEnabled: boolean;
    imageEnabled: boolean;
    chatRpmLimit: number;
    landingRpmLimit: number;
    imageRpmLimit: number;
  };
  storageMetrics: {
    mongoUsageMb: number;
    cloudinaryUsageMb: number;
    updatedAt: string;
  };
  features: PlanFeatures;
}

async function fetchPlanStatus(token: string): Promise<PlanStatusData> {
  const { data } = await api.get<PlanStatusData>("/tenants/plan-status", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export function usePlanStatus() {
  const { token, isAdmin } = useAuth();

  const { data, isLoading, isError } = useQuery<PlanStatusData>({
    queryKey: ["planStatus"],
    queryFn: () => fetchPlanStatus(token ?? ""),
    enabled: !!token && isAdmin,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return { data, isLoading, isError };
}
