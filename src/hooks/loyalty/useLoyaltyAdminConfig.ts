"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LoyaltyAdminConfig } from "@/types/loyalty-admin";

export function useLoyaltyAdminConfig() {
  return useQuery<{ config: LoyaltyAdminConfig; isDefault: boolean }>({
    queryKey: ["loyaltyAdmin", "config"],
    queryFn: async () => (await api.get("/loyalty/admin/config")).data,
    staleTime: 30_000,
  });
}

export function useSaveLoyaltyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: LoyaltyAdminConfig) => (await api.put("/loyalty/admin/config", config)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["clientOverview"] });
    },
  });
}
