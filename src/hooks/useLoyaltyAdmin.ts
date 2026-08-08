"use client";

/**
 * Growth Studio — admin React Query hookovi (dashboard ?tab=growth).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LoyaltyRewardInfo } from "@/hooks/useLoyalty";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

export interface LoyaltyAdminConfig {
  enabled: boolean;
  currencies: {
    hearts: {
      enabled: boolean;
      nameOne: string;
      nameFew: string;
      nameMany: string;
      emoji: string;
    };
    points: {
      enabled: boolean;
      nameOne: string;
      nameFew: string;
      nameMany: string;
      emoji: string;
      per100Rsd: number;
    };
  };
  earning: {
    heartsPerCompletedVisit: number;
    welcomeBonusPoints: number;
    checkinPoints: number;
  };
  streak: { windowDays: number };
  sharing: {
    enabled: boolean;
    friendReward: LoyaltyRewardInfo;
    maxActivePerClient: number;
    referrerRewardPoints: number;
  };
  milestones: Array<{ heartsRequired: number; reward: LoyaltyRewardInfo }>;
  pointsShop: Array<{ costPoints: number; reward: LoyaltyRewardInfo }>;
  noShowPolicy: {
    mode: "none" | "streak_reset" | "hearts_penalty";
    heartsPenalty: number;
  };
  autoComplete: {
    enabled: boolean;
    promptAfterHours: number;
    autoAfterHours: number;
  };
  celebration: { intensity: "off" | "subtle" | "normal" | "max" };
  antiAbuse: { maxHeartsPerDay: number; maxPointsPerDay: number };
}

export interface LoyaltyAdminAccount {
  _id: string;
  tenantUserId: string;
  heartsBalance: number;
  pointsBalance: number;
  lifetimeHearts: number;
  lifetimePoints: number;
  completedVisits: number;
  noShows: number;
  totalSpend: number;
  lastVisitAt?: string;
  /** Niz poseta (QR check-in navika). Phase 1/2. */
  checkinStreak?: number;
  client: { _id: string; name?: string; email?: string; role?: string } | null;
}

export interface LoyaltyAdminLedgerEntry {
  _id: string;
  entryType: string;
  currency: "hearts" | "points";
  amount: number;
  description: string;
  createdAt: string;
  source?: { reason?: string; ruleId?: string };
}

export interface LoyaltyAdminVoucher {
  _id: string;
  code: string;
  type: "percent" | "fixed" | "free_service";
  value: number;
  serviceName?: string;
  origin: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
  owner: { name?: string; email?: string } | null;
}

// ─── Hookovi ──────────────────────────────────────────────────────────────────

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
    mutationFn: async (config: LoyaltyAdminConfig) =>
      (await api.put("/loyalty/admin/config", config)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin"] });
    },
  });
}

export function useLoyaltyAdminAccounts(q: string) {
  return useQuery<{ accounts: LoyaltyAdminAccount[] }>({
    queryKey: ["loyaltyAdmin", "accounts", q],
    queryFn: async () =>
      (
        await api.get("/loyalty/admin/accounts", {
          params: q ? { q } : undefined,
        })
      ).data,
    staleTime: 15_000,
  });
}

export function useLoyaltyAdminLedger(accountId: string | null) {
  return useQuery<{ entries: LoyaltyAdminLedgerEntry[] }>({
    queryKey: ["loyaltyAdmin", "ledger", accountId],
    queryFn: async () =>
      (await api.get(`/loyalty/admin/accounts/${accountId}/ledger`)).data,
    enabled: Boolean(accountId),
  });
}

export function useAdjustLoyaltyAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      accountId: string;
      currency: "hearts" | "points";
      amount: number;
      reason: string;
    }) =>
      (
        await api.post(`/loyalty/admin/accounts/${params.accountId}/adjust`, {
          currency: params.currency,
          amount: params.amount,
          reason: params.reason,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin"] });
    },
  });
}

export function useLoyaltyAdminVouchers() {
  return useQuery<{ vouchers: LoyaltyAdminVoucher[] }>({
    queryKey: ["loyaltyAdmin", "vouchers"],
    queryFn: async () => (await api.get("/loyalty/admin/vouchers")).data,
    staleTime: 15_000,
  });
}

export function useIssueLoyaltyVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenantUserId: string;
      type: "percent" | "fixed" | "free_service";
      value: number;
      serviceName?: string;
      expiresDays: number;
    }) => (await api.post("/loyalty/admin/vouchers", params)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin", "vouchers"] });
    },
  });
}

export function useRevokeLoyaltyVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (voucherId: string) =>
      (await api.post(`/loyalty/admin/vouchers/${voucherId}/revoke`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin", "vouchers"] });
    },
  });
}

// ─── Duplikati / merge (Phase 4b/4c) ───────────────────────────────────────────

export interface DuplicateAccount {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isRegistered: boolean;
  createdAt: string | null;
  hearts: number;
  points: number;
  visits: number;
  appointments: number;
}

export interface DuplicateGroup {
  key: string;
  accounts: DuplicateAccount[];
}

export function useDuplicateGroups() {
  return useQuery<{ groups: DuplicateGroup[] }>({
    queryKey: ["loyaltyAdmin", "duplicates"],
    queryFn: async () => (await api.get("/users/duplicates")).data,
    staleTime: 15_000,
  });
}

export interface MergeResult {
  ok: boolean;
  alreadyMerged?: boolean;
  moved: {
    appointments: number;
    ledger: number;
    events: number;
    vouchers: number;
    notifications: number;
    testimonials: number;
    audience: number;
    referrals: number;
  };
}

export function useMergeUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { sourceId: string; targetId: string }) =>
      (await api.post("/users/merge", params)).data as MergeResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// ─── Merge preview (backend-računat before/after + moves + rizici) ─────────────

export interface MergeAccountSummary {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isRegistered: boolean;
  status: string;
  hearts: number;
  points: number;
  visits: number;
  appointments: number;
  vouchers: number;
}

export interface MergeMoves {
  appointments: number;
  ledgerEntries: number;
  loyaltyEvents: number;
  vouchersOwned: number;
  vouchersGifted: number;
  referralsAsReferrer: number;
  referralsAsReferred: number;
  notifications: number;
  testimonials: number;
  audienceContacts: number;
}

export interface MergePreview {
  allowed: boolean;
  reason?: string;
  source: MergeAccountSummary | null;
  target: MergeAccountSummary | null;
  after: {
    hearts: number;
    points: number;
    visits: number;
    appointments: number;
    vouchers: number;
  } | null;
  moves: MergeMoves | null;
  risks: string[];
}

export function useMergePreview(
  sourceId: string | null,
  targetId: string | null,
) {
  return useQuery<MergePreview>({
    queryKey: ["loyaltyAdmin", "mergePreview", sourceId, targetId],
    queryFn: async () =>
      (await api.post("/users/merge/preview", { sourceId, targetId })).data,
    enabled: Boolean(sourceId && targetId),
    staleTime: 5_000,
  });
}
