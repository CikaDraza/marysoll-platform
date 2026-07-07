import { Schema, model, models } from "mongoose";

// ─── Growth Studio: loyalty nalog klijenta (1 po {tenant, klijent}) ───────────
// Balansi su KEŠ održavan $inc-om iz ledger-a — izvor istine je LoyaltyLedger
// (append-only). Balans se uvek može rekonstruisati agregacijom.

const loyaltyAccountSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    tenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      required: true,
    },

    heartsBalance: { type: Number, default: 0 },
    pointsBalance: { type: Number, default: 0 },
    lifetimeHearts: { type: Number, default: 0 },
    lifetimePoints: { type: Number, default: 0 },

    /** Snapshot tier-a (Faza 2 — do tada default) */
    tier: { type: String, default: "novi" },
    tierSince: { type: Date },

    completedVisits: { type: Number, default: 0 },
    noShows: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    lastVisitAt: { type: Date },
    /**
     * Streak = NAVIKA: uzastopne posete (QR check-in) unutar prozora
     * (config.streak.windowDays). No-show soft kazna = reset. Phase 1: streak
     * vodi check-in, ne više completion (vidi engine.handleCheckin).
     */
    currentStreak: { type: Number, default: 0 },
    /** Najduži ostvaren streak (rekord). Phase 1. */
    longestStreak: { type: Number, default: 0 },

    /** Lazy-generisan pri prvom deljenju (Faza 2 — referral) */
    referralCode: { type: String },
    referredByAccountId: { type: Schema.Types.ObjectId, ref: "LoyaltyAccount" },

    /** Loyalty briga (birthday reward) — namerno NE na TenantUser modelu */
    birthday: {
      day: { type: Number, min: 1, max: 31 },
      month: { type: Number, min: 1, max: 12 },
    },
  },
  { timestamps: true },
);

loyaltyAccountSchema.index({ tenantId: 1, tenantUserId: 1 }, { unique: true });
loyaltyAccountSchema.index({ tenantId: 1, tier: 1 });
loyaltyAccountSchema.index(
  { tenantId: 1, referralCode: 1 },
  { unique: true, partialFilterExpression: { referralCode: { $type: "string" } } },
);

export const LoyaltyAccount =
  models.LoyaltyAccount || model("LoyaltyAccount", loyaltyAccountSchema);
