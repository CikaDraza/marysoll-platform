"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { api } from "@/lib/api";
import { planStatusDataSchema, type PlanStatusData } from "@/types/plan-status";

async function fetchPlanStatus(token: string): Promise<PlanStatusData> {
  const { data } = await api.get<unknown>("/tenants/plan-status", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return planStatusDataSchema.parse(data);
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
