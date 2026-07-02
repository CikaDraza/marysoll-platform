// ─── Growth Studio: deljeni domen tipovi ──────────────────────────────────────

import type { Types } from "mongoose";

export type LoyaltyCurrency = "hearts" | "points";

export type LoyaltyEventType =
  | "appointment_completed"
  | "appointment_no_show"
  | "appointment_completion_reverted"
  | "appointment_cancelled"
  | "client_registered"
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

export interface CurrencyNames {
  enabled: boolean;
  nameOne: string;
  nameFew: string;
  nameMany: string;
  emoji: string;
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
  };
  milestones: Array<{ heartsRequired: number; reward: RewardSpec }>;
  pointsShop: Array<{ costPoints: number; reward: RewardSpec }>;
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

/** Srpska deklinacija broja uz naziv valute: 1 srce / 2 srca / 5 srca. */
export function formatCurrencyAmount(
  n: number,
  names: Pick<CurrencyNames, "nameOne" | "nameFew" | "nameMany">,
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
