"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LoyaltyAdminVoucher } from "@/types/loyalty-admin";

export function useLoyaltyAdminVouchers() {
  return useQuery<{ vouchers: LoyaltyAdminVoucher[] }>({ queryKey: ["loyaltyAdmin", "vouchers"], queryFn: async () => (await api.get("/loyalty/admin/vouchers")).data, staleTime: 15_000 });
}

export function useIssueLoyaltyVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { tenantUserId: string; type: "percent" | "fixed" | "free_service"; value: number; serviceName?: string; expiresDays: number }) =>
      (await api.post("/loyalty/admin/vouchers", params)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin", "vouchers"] }),
  });
}

export function useRevokeLoyaltyVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (voucherId: string) => (await api.post(`/loyalty/admin/vouchers/${voucherId}/revoke`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin", "vouchers"] }),
  });
}
