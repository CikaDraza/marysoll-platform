import { Schema, model, models } from "mongoose";

// ─── Growth Studio: per-tenant konfiguracija loyalty programa ─────────────────
// Jedna kolekcija (1 dokument po tenantu) umesto embed-a u SalonProfile —
// event processing (cron + API hot path) ne sme da deserializuje landingStructure.

const rewardSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["percent", "fixed", "free_service"],
      required: true,
    },
    /** percent: 0-100, fixed: iznos u RSD, free_service: ignorisano */
    value: { type: Number, default: 0, min: 0 },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    /** Naziv usluge za prikaz kod free_service nagrade */
    serviceName: { type: String, default: "" },
    /** Rok važenja izdatog vaučera u danima */
    expiresDays: { type: Number, default: 90, min: 1 },
  },
  { _id: false },
);

const currencyNamesSchema = {
  /** Srpska deklinacija: 1 srce / 2 srca / 5 srca */
  nameOne: { type: String, default: "" },
  nameFew: { type: String, default: "" },
  nameMany: { type: String, default: "" },
  emoji: { type: String, default: "" },
};

const loyaltyConfigSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
    },
    /** Salon mora eksplicitno da uključi program (i kada ga plan dozvoljava) */
    enabled: { type: Boolean, default: false },

    // ── Valute (svaka nezavisno uključiva — hearts-only je najjednostavniji setup)
    currencies: {
      hearts: {
        enabled: { type: Boolean, default: true },
        nameOne: { ...currencyNamesSchema.nameOne, default: "srce" },
        nameFew: { ...currencyNamesSchema.nameFew, default: "srca" },
        nameMany: { ...currencyNamesSchema.nameMany, default: "srca" },
        emoji: { ...currencyNamesSchema.emoji, default: "❤️" },
      },
      points: {
        enabled: { type: Boolean, default: false },
        nameOne: { ...currencyNamesSchema.nameOne, default: "poen" },
        nameFew: { ...currencyNamesSchema.nameFew, default: "poena" },
        nameMany: { ...currencyNamesSchema.nameMany, default: "poena" },
        emoji: { ...currencyNamesSchema.emoji, default: "⭐" },
        /** Koliko poena donosi 100 RSD potrošnje */
        per100Rsd: { type: Number, default: 1, min: 0 },
      },
    },

    // ── Sticanje
    earning: {
      heartsPerCompletedVisit: { type: Number, default: 1, min: 0 },
      /** Welcome bonus u poenima pri registraciji (0 = isključeno) */
      welcomeBonusPoints: { type: Number, default: 0, min: 0 },
      /** Poeni po QR check-inu (0 = isključeno; traži points.enabled). Phase 1 */
      checkinPoints: { type: Number, default: 10, min: 0 },
    },

    // ── Streak (navika): koliko dana razmaka pre reseta streak-a
    streak: {
      windowDays: { type: Number, default: 45, min: 1 },
    },

    // ── Milestone (punch-card semantika: srca se TROŠE na nagradu,
    //    balans prikazuje napredak ka sledećoj — "3/5")
    milestones: [
      new Schema(
        { heartsRequired: { type: Number, required: true, min: 1 }, reward: rewardSchema },
        { _id: false },
      ),
    ],

    // ── Points shop (mali katalog nagrada koje klijent kupuje poenima)
    pointsShop: [
      new Schema(
        { costPoints: { type: Number, required: true, min: 1 }, reward: rewardSchema },
        { _id: false },
      ),
    ],

    // ── No-show politika (default soft — bez oduzimanja)
    noShowPolicy: {
      mode: {
        type: String,
        enum: ["none", "streak_reset", "hearts_penalty"],
        default: "streak_reset",
      },
      heartsPenalty: { type: Number, default: 1, min: 0 },
    },

    // ── Dvostepeni auto-complete (prompt adminu → tek onda auto)
    autoComplete: {
      enabled: { type: Boolean, default: false },
      promptAfterHours: { type: Number, default: 24, min: 1 },
      autoAfterHours: { type: Number, default: 48, min: 2 },
    },

    // ── Celebration sloj
    celebration: {
      intensity: {
        type: String,
        enum: ["off", "subtle", "normal", "max"],
        default: "normal",
      },
    },

    // ── Anti-abuse limiti (globalni, nezavisno od pravila)
    antiAbuse: {
      maxHeartsPerDay: { type: Number, default: 3, min: 1 },
      maxPointsPerDay: { type: Number, default: 2000, min: 1 },
    },

    // ── Rezervisano za Fazu 2/3 (tieri, referral, promocije) — šeme se
    //    dodaju kada moduli budu implementirani; polje čuva forward-compat.
    modules: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const LoyaltyConfig =
  models.LoyaltyConfig || model("LoyaltyConfig", loyaltyConfigSchema);
