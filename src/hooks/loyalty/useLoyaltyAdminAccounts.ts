"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LoyaltyAdminAccount, LoyaltyAdminLedgerEntry } from "@/types/loyalty-admin";

export function useLoyaltyAdminAccounts(q: string) {
  return useQuery<{ accounts: LoyaltyAdminAccount[] }>({
    queryKey: ["loyaltyAdmin", "accounts", q],
    queryFn: async () => (await api.get("/loyalty/admin/accounts", { params: q ? { q } : undefined })).data,
    staleTime: 15_000,
  });
}

export function useLoyaltyAdminLedger(accountId: string | null) {
  return useQuery<{ entries: LoyaltyAdminLedgerEntry[] }>({
    queryKey: ["loyaltyAdmin", "ledger", accountId],
    queryFn: async () => (await api.get(`/loyalty/admin/accounts/${accountId}/ledger`)).data,
    enabled: Boolean(accountId),
  });
}

export function useAdjustLoyaltyAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { accountId: string; currency: "hearts" | "points"; amount: number; reason: string }) =>
      (await api.post(`/loyalty/admin/accounts/${params.accountId}/adjust`, {
        currency: params.currency,
        amount: params.amount,
        reason: params.reason,
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["clientOverview"] });
    },
  });
}
