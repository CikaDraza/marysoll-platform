// ─── Growth Studio: deljeni domen tipovi ──────────────────────────────────────

import type { Types } from "mongoose";
// Čista domenska logika (format valute) živi u @panta/loyalty-engine (Phase 0);
// re-export ovde da postojeći `./types` importeri rade nepromenjeno.
import type { CurrencyNames } from "@/lib/platform/loyalty-client";
export type { CurrencyNames };
export { formatCurrencyAmount } from "@/lib/platform/loyalty-client";

export type LoyaltyCurrency = "hearts" | "points";

export type LoyaltyEventType =
  | "appointment_completed"
  | "appointment_no_show"
  | "appointment_completion_reverted"
  | "appointment_cancelled"
  | "client_registered"
  | "client_checkin"
  | "referral_completed"
  | "manual_adjustment";

export type LoyaltyEntryType = "earn" | "redeem" | "adjust" | "revoke" | "expire";

export type VoucherType = "percent" | "fixed" | "free_service";

export interface RewardSpec {
  type: VoucherType;
  value: number;
  serviceId?: Types.ObjectId | string | null;
  serviceName?: string;
  expiresDays: number;
}

export interface LoyaltyConfigLean {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  enabled: boolean;
  currencies: {
    hearts: CurrencyNames;
    points: CurrencyNames & { per100Rsd: number };
  };
  earning: {
    heartsPerCompletedVisit: number;
    welcomeBonusPoints: number;
    /** Poeni po QR check-inu (0 = isključeno). Phase 1. */
    checkinPoints?: number;
  };
  /** Streak (navika): razmak preko kog se streak resetuje. Phase 1. */
  streak?: {
    windowDays: number;
  };
  /** Share voucher (poklon prijateljici). Phase 2. */
  sharing?: {
    enabled: boolean;
    friendReward?: RewardSpec;
    maxActivePerClient?: number;
    /** Nagrada osobi koja je pozvala prijateljicu, tek posle hard-gate-a. */
    referrerRewardPoints?: number;
  };
  milestones: Array<{ heartsRequired: number; reward: RewardSpec }>;
  /**
   * Points shop: `id` je stabilan identitet ponude (T1-4) i jedini autoritet
   * redemption-a. Opcion je samo zbog zatečenih dokumenata pre backfill-a —
   * ponuda bez id-a se NE nudi za kupovinu.
   */
  pointsShop: Array<{ id?: string; costPoints: number; reward: RewardSpec }>;
  noShowPolicy: {
    mode: "none" | "streak_reset" | "hearts_penalty";
    heartsPenalty: number;
  };
  autoComplete: {
    enabled: boolean;
    promptAfterHours: number;
    autoAfterHours: number;
  };
  celebration: {
    intensity: "off" | "subtle" | "normal" | "max";
  };
  antiAbuse: {
    maxHeartsPerDay: number;
    maxPointsPerDay: number;
  };
}

export interface LoyaltyAccountLean {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  tenantUserId: Types.ObjectId;
  heartsBalance: number;
  pointsBalance: number;
  lifetimeHearts: number;
  lifetimePoints: number;
  tier: string;
  completedVisits: number;
  noShows: number;
  totalSpend: number;
  lastVisitAt?: Date;
  currentStreak: number;
  /** Check-in streak (navika) — odvojen od completion-driven currentStreak. */
  checkinStreak?: number;
  longestCheckinStreak?: number;
  lastCheckinAt?: Date;
}

export interface LoyaltyEventLean {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  type: LoyaltyEventType;
  sourceType: "appointment" | "tenant_user" | "admin";
  sourceId: string;
  subjectTenantUserId: Types.ObjectId;
  payload: {
    appointmentId?: string;
    spend?: number;
    serviceName?: string;
    revertCount?: number;
    [key: string]: unknown;
  };
  status: "pending" | "processed" | "failed" | "skipped";
  attempts: number;
}
