"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

export type SuperAdminSalonMarketplace = {
  tenantId: string;
  name: string;
  city: string;
  marketplaceEnabled: boolean;
  marketplaceApprovedAt: string | null;
  cityPopularityScore: number;
};

type MarketplaceResponse = {
  success: boolean;
  data: SuperAdminSalonMarketplace;
  message?: string;
};

async function readErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string" ? body.error : "Greška pri čuvanju.";
}

export function useSuperAdminSalonMarketplace(tenantId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [scoreDraft, setScoreDraft] = useState<{
    tenantId: string;
    value: string | null;
  }>({ tenantId, value: null });

  const queryKey = useMemo(
    () => ["superadmin-salon-marketplace", tenantId],
    [tenantId],
  );

  const query = useQuery<SuperAdminSalonMarketplace>({
    queryKey,
    enabled: Boolean(token && tenantId),
    queryFn: async () => {
      const res = await fetch(
        `/api/superadmin/tenants/${tenantId}/marketplace`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const json = (await res.json()) as MarketplaceResponse;
      return json.data;
    },
  });

  const savedScore =
    typeof query.data?.cityPopularityScore === "number"
      ? String(query.data.cityPopularityScore)
      : "0";
  const isCurrentDraft = scoreDraft.tenantId === tenantId;
  const scoreInput =
    isCurrentDraft && scoreDraft.value !== null ? scoreDraft.value : savedScore;

  const mutation = useMutation<
    MarketplaceResponse,
    Error,
    { enabled?: boolean; cityPopularityScore?: number }
  >({
    mutationFn: async (payload) => {
      const res = await fetch(
        `/api/superadmin/tenants/${tenantId}/marketplace`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as MarketplaceResponse;
    },
    onSuccess: (response) => {
      qc.setQueryData(queryKey, response.data);
      qc.invalidateQueries({ queryKey: ["superadmin-marketplace-list"] });
      setScoreDraft({ tenantId, value: null });
      toast.success(response.message ?? "Sačuvano.");
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    marketplaceEnabled: Boolean(query.data?.marketplaceEnabled),
    scoreInput,
    setScoreInput: (value: string) => setScoreDraft({ tenantId, value }),
    toggleEnabled: () =>
      mutation.mutate({ enabled: !query.data?.marketplaceEnabled }),
    saveScore: () => {
      const score = Number(scoreInput);
      if (!Number.isFinite(score) || score < 0 || score > 10) {
        toast.error("Popularnost mora biti broj između 0 i 10.");
        return;
      }
      mutation.mutate({ cityPopularityScore: score });
    },
    isSaving: mutation.isPending,
  };
}
