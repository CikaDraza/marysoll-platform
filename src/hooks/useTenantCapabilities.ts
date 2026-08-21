"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { TenantCapabilitySnapshot } from "@/types/tenant-capabilities";

async function fetchTenantCapabilities(): Promise<TenantCapabilitySnapshot> {
  const { data } = await api.get<TenantCapabilitySnapshot>("/tenant/capabilities");
  return data;
}

/** Browser potrošač isključivo server-side capability projekcije. */
export function useTenantCapabilities() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["tenantCapabilities"],
    queryFn: fetchTenantCapabilities,
    enabled: Boolean(token),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
