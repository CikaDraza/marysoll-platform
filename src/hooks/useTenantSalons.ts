// hooks/useTenantSalons.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "./useAuth";

export interface TenantSalon {
  _id: string;
  name: string;
  city?: string;
}

async function fetchTenantSalons(): Promise<TenantSalon[]> {
  const res = await api.get<{ salons: TenantSalon[] }>("/salons");
  return res.data.salons;
}

export function useTenantSalons() {
  const { token, isAdmin } = useAuth();

  return useQuery<TenantSalon[]>({
    queryKey: ["tenantSalons"],
    queryFn: fetchTenantSalons,
    enabled: !!token && isAdmin,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
