"use client";

/**
 * Growth Studio — klijentski React Query hookovi (panel "Nagrade").
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Stanje niza poseta (QR check-in): još nema / aktivan / prekinut (van prozora). */
export type CheckinStreakStatus = "none" | "active" | "broken";

// ─── Tipovi (mirror API response-a) ───────────────────────────────────────────

export interface LoyaltyCurrencyInfo {
  enabled: boolean;
  nameOne: string;
  nameFew: string;
  nameMany: string;
  emoji: string;
  per100Rsd?: number;
}

export interface LoyaltyRewardInfo {
  type: "percent" | "fixed" | "free_service";
  value: number;
  serviceName?: string;
  expiresDays: number;
}

export interface LoyaltyMeResponse {
  enabled: boolean;
  account: {
    heartsBalance: number;
    pointsBalance: number;
    lifetimeHearts: number;
    lifetimePoints: number;
    completedVisits: number;
    currentStreak: number;
    checkinStreak: number;
    longestCheckinStreak: number;
    lastCheckinAt: string | null;
  } | null;
  config: {
    currencies: { hearts: LoyaltyCurrencyInfo; points: LoyaltyCurrencyInfo };
    milestone: { heartsRequired: number; reward: LoyaltyRewardInfo } | null;
    pointsShop: Array<{ costPoints: number; reward: LoyaltyRewardInfo }>;
    celebration: { intensity: "off" | "subtle" | "normal" | "max" };
    streak?: { windowDays: number };
    sharing: { enabled: boolean; friendReward: LoyaltyRewardInfo | null } | null;
  } | null;
}

export interface SharedVoucherResult {
  ok: boolean;
  code: string;
  type: "percent" | "fixed" | "free_service";
  value: number;
  serviceName?: string;
  expiresAt?: string | null;
}

export interface LoyaltyLedgerEntry {
  _id: string;
  entryType: "earn" | "redeem" | "adjust" | "revoke" | "expire";
  currency: "hearts" | "points";
  amount: number;
  description: string;
  createdAt: string;
}

export interface LoyaltyVoucherInfo {
  _id: string;
  code: string;
  type: "percent" | "fixed" | "free_service";
  value: number;
  serviceName?: string;
  status: "active" | "reserved" | "redeemed";
  expiresAt?: string;
  redeemedAt?: string;
}

export interface LoyaltyMoment {
  _id: string;
  type: string;
  title: string;
  message: string;
  metadata?: {
    hearts?: number;
    points?: number;
    heartsBalance?: number;
    heartsRequired?: number;
    voucherCode?: string;
    voucherType?: string;
    voucherValue?: number;
    voucherExpiresAt?: string;
  };
}

// ─── Hookovi ──────────────────────────────────────────────────────────────────

export function useLoyaltyMe(opts?: { enabled?: boolean }) {
  return useQuery<LoyaltyMeResponse>({
    queryKey: ["loyalty", "me"],
    queryFn: async () => (await api.get("/loyalty/client/me")).data,
    staleTime: 30_000,
    retry: 1,
    enabled: opts?.enabled ?? true,
  });
}

export function useLoyaltyLedger(enabled = true) {
  return useQuery<{ entries: LoyaltyLedgerEntry[] }>({
    queryKey: ["loyalty", "ledger"],
    queryFn: async () => (await api.get("/loyalty/client/ledger")).data,
    staleTime: 30_000,
    enabled,
  });
}

export function useLoyaltyVouchers(enabled = true) {
  return useQuery<{ vouchers: LoyaltyVoucherInfo[] }>({
    queryKey: ["loyalty", "vouchers"],
    queryFn: async () => (await api.get("/loyalty/client/vouchers")).data,
    staleTime: 30_000,
    enabled,
  });
}

export function useLoyaltyMoments(enabled = true) {
  return useQuery<{ moments: LoyaltyMoment[] }>({
    queryKey: ["loyalty", "moments"],
    queryFn: async () => (await api.get("/loyalty/client/moments")).data,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    enabled,
  });
}

export function useMarkMomentsSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) =>
      (await api.post("/loyalty/client/moments", { ids })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
    },
  });
}

/** Share voucher — klijent generiše poklon-vaučer za prijateljicu (Phase 2). */
export function useShareVoucher() {
  const queryClient = useQueryClient();
  return useMutation<SharedVoucherResult, Error, void>({
    mutationFn: async () =>
      (await api.post("/loyalty/client/share-voucher")).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", "vouchers"] });
    },
  });
}

/**
 * Stanje niza poseta izvedeno iz me odgovora — logika ovde (ne u JSX).
 * none = još nema niza; active = poslednji check-in unutar prozora;
 * broken = prošao prozor (resetuje se na sledećem check-inu). none/broken → UI grayscale.
 */
export function useCheckinStreak(me: LoyaltyMeResponse | undefined): {
  streak: number;
  longest: number;
  status: CheckinStreakStatus;
} {
  // Snapshot vremena na mount (Date.now() nije dozvoljen u render-u/memo-u).
  const [nowMs] = useState(() => Date.now());
  return useMemo(() => {
    const account = me?.account ?? null;
    const streak = account?.checkinStreak ?? 0;
    const longest = account?.longestCheckinStreak ?? 0;
    const windowDays = me?.config?.streak?.windowDays ?? 45;
    const lastMs = account?.lastCheckinAt
      ? new Date(account.lastCheckinAt).getTime()
      : NaN;

    let status: CheckinStreakStatus = "none";
    if (streak >= 1 && !Number.isNaN(lastMs)) {
      const DAY = 86_400_000;
      const gapDays = Math.floor(nowMs / DAY) - Math.floor(lastMs / DAY);
      status = gapDays > windowDays ? "broken" : "active";
    }
    return { streak, longest, status };
  }, [me, nowMs]);
}

// ─── Helperi za prikaz ────────────────────────────────────────────────────────

/** Srpska deklinacija: 1 srce / 2 srca / 5 srca. */
export function formatLoyaltyAmount(
  n: number,
  names: Pick<LoyaltyCurrencyInfo, "nameOne" | "nameFew" | "nameMany">,
): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  let word = names.nameMany;
  if (mod10 === 1 && mod100 !== 11) word = names.nameOne;
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    word = names.nameFew;
  return `${n} ${word}`;
}

export function describeLoyaltyReward(reward: LoyaltyRewardInfo): string {
  if (reward.type === "percent") return `${reward.value}% popusta`;
  if (reward.type === "fixed") return `${reward.value} RSD popusta`;
  return `Gratis: ${reward.serviceName || "usluga"}`;
}
