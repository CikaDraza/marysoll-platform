import "server-only";

// ─── Growth Studio: čitanje per-tenant konfiguracije ──────────────────────────

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import type { LoyaltyConfigLean } from "./types";

export async function getLoyaltyConfig(
  tenantId: Types.ObjectId | string,
): Promise<LoyaltyConfigLean | null> {
  await connectToDB();
  return LoyaltyConfig.findOne({ tenantId }).lean<LoyaltyConfigLean>();
}

/**
 * Default vrednosti za admin formu kada salon još nema konfiguraciju.
 * Upis pravi dokument tek kada vlasnik prvi put sačuva podešavanja.
 */
export const DEFAULT_LOYALTY_CONFIG = {
  enabled: false,
  currencies: {
    hearts: {
      enabled: true,
      nameOne: "srce",
      nameFew: "srca",
      nameMany: "srca",
      emoji: "❤️",
    },
    points: {
      enabled: false,
      nameOne: "poen",
      nameFew: "poena",
      nameMany: "poena",
      emoji: "⭐",
      per100Rsd: 1,
    },
  },
  earning: {
    heartsPerCompletedVisit: 1,
    welcomeBonusPoints: 0,
    checkinPoints: 10,
  },
  streak: { windowDays: 45 },
  milestones: [
    {
      heartsRequired: 5,
      reward: {
        type: "percent" as const,
        value: 20,
        serviceName: "",
        expiresDays: 90,
      },
    },
  ],
  pointsShop: [],
  noShowPolicy: { mode: "streak_reset" as const, heartsPenalty: 1 },
  autoComplete: { enabled: false, promptAfterHours: 24, autoAfterHours: 48 },
  celebration: { intensity: "normal" as const },
  antiAbuse: { maxHeartsPerDay: 3, maxPointsPerDay: 2000 },
};
