/**
 * hooks/usePlanFeatures.ts
 *
 * Client-side hook za provjeru feature-a prema aktivnom planu tenanta.
 *
 * Čita /api/subscriptions/features endpoint koji vraća efektivne feature-e
 * za trenutnog admin korisnika (uključujući superadmin override).
 *
 * Korišćenje:
 *   const { hasFeature, features, plan } = usePlanFeatures();
 *   if (!hasFeature("statistics")) return <UpgradePrompt feature="statistics" />;
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { api } from "@/lib/api";
import type { PlanFeatures, PlanName } from "@/lib/plans/planFeatures";
import {
  PLAN_FEATURES,
  isWithinLimit as isWithinPlanLimit,
} from "@/lib/plans/planFeatures";

interface SubscriptionFeaturesResponse {
  plan: PlanName;
  status: string;
  features: PlanFeatures;
  usage: {
    aiRequestsThisMonth: number;
    aiRequestsResetAt: string;
    storageUsedGb: number;
  };
  featureOverrides: Partial<PlanFeatures> | null;
  overrideExpiresAt: string | null;
  overrideNote: string | null;
  currentPeriodEnd: string;
}

async function fetchSubscriptionFeatures(
  token: string,
): Promise<SubscriptionFeaturesResponse> {
  const { data } = await api.get("/subscriptions/features", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export function usePlanFeatures() {
  const { token, isAdmin } = useAuth();

  const { data, isLoading, isError } = useQuery<SubscriptionFeaturesResponse>({
    queryKey: ["subscriptionFeatures", token],
    queryFn: () => fetchSubscriptionFeatures(token ?? ""),
    // Samo admini imaju subscription — klijenti salona ne trebaju ovo
    enabled: !!token && isAdmin,
    staleTime: 60_000, // 1 minut cache
    refetchOnWindowFocus: true,
  });

  const features = data?.features ?? PLAN_FEATURES.maria;
  const plan = data?.plan ?? "maria";

  /**
   * Provjeri da li aktivan plan ima feature.
   * Vraća false dok se učitava (safe default = restricted).
   */
  function hasFeature<K extends keyof PlanFeatures>(feature: K): boolean {
    if (isLoading) return false;
    const value = features[feature];
    return Boolean(value);
  }

  /**
   * Provjeri da li je usage unutar limita.
   * -1 = neograničeno → uvijek true.
   */
  function isWithinLimit(
    type: "aiRequests" | "storage" | "newsletterSubscribers" | "staffMembers",
    current: number,
  ): boolean {
    const limitMap: Record<typeof type, number> = {
      aiRequests: features.aiRequestsPerMonth,
      storage: features.dbStorageGb,
      newsletterSubscribers: features.newsletterSubscribers,
      staffMembers: features.staffMembers,
    };
    return isWithinPlanLimit(current, limitMap[type]);
  }

  const hasOverride = !!data?.featureOverrides;

  return {
    features,
    plan,
    status: data?.status,
    isLoading,
    isError,
    hasFeature,
    isWithinLimit,
    usage: data?.usage,
    currentPeriodEnd: data?.currentPeriodEnd,
    hasOverride,
    overrideNote: data?.overrideNote,
    overrideExpiresAt: data?.overrideExpiresAt,
  };
}
