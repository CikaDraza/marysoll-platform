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
    /** Uzastopni završeni termini bez no-show-a (no-show soft kazna = reset) */
    currentStreak: { type: Number, default: 0 },

    // ── Check-in streak (NAVIKA, QR check-in) — ODVOJEN od completion streak-a
    //    (currentStreak) da check-in bude aditivan i ne dira postojeće. Phase 1.
    /** Uzastopne posete (QR check-in) unutar prozora config.streak.windowDays */
    checkinStreak: { type: Number, default: 0 },
    longestCheckinStreak: { type: Number, default: 0 },
    lastCheckinAt: { type: Date },

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
