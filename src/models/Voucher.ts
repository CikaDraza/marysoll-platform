import { Schema, model, models } from "mongoose";

// ─── Growth Studio: vaučeri ───────────────────────────────────────────────────
// Lifecycle preko CAS tranzicija (findOneAndUpdate sa status uslovom) — bez
// multi-doc transakcija: active → reserved (pri bookingu) → redeemed (completion)
// ili nazad na active (otkazivanje/odbijanje). ownerTenantUserId=null označava
// nepreuzet poklon (Faza 2 gift flow).

const voucherSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    code: { type: String, required: true },

    type: {
      type: String,
      enum: ["percent", "fixed", "free_service"],
      required: true,
    },
    /** percent: 0-100, fixed: RSD iznos, free_service: 0 */
    value: { type: Number, default: 0, min: 0 },
    /** Ograničenje na usluge (prazno = sve usluge) */
    serviceScope: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    /** Naziv usluge za prikaz kod free_service */
    serviceName: { type: String, default: "" },

    origin: {
      type: String,
      enum: ["auto_rule", "manual", "referral", "gift", "points_shop"],
      required: true,
    },
    ownerTenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      default: null,
    },
    giftedByTenantUserId: { type: Schema.Types.ObjectId, ref: "TenantUser" },

    status: {
      type: String,
      enum: ["active", "reserved", "redeemed", "expired", "revoked"],
      default: "active",
    },
    reservedAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    redeemedAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    redeemedAt: { type: Date },
    expiresAt: { type: Date },

    /**
     * Uslovi ponude U TRENUTKU kupovine (origin: "points_shop").
     *
     * Vaučer već nosi svoje efektivne uslove (`type`/`value`/`serviceScope`/
     * `expiresAt`) i oni su nepromenljivi, ali audit mora da zna i ŠTA je
     * kupljeno i po kojoj ceni: salon sme kasnije da izmeni ili obriše ponudu
     * iz `LoyaltyConfig.pointsShop`, a već izdat vaučer se time ne menja.
     */
    pointsShopSnapshot: {
      type: {
        offerId: { type: String, required: true },
        costPoints: { type: Number, required: true },
        rewardType: {
          type: String,
          enum: ["percent", "fixed", "free_service"],
          required: true,
        },
        rewardValue: { type: Number, default: 0 },
        serviceId: { type: Schema.Types.ObjectId, ref: "Service", default: null },
        serviceName: { type: String, default: "" },
        expiresDays: { type: Number, default: null },
        redeemedForAppointmentId: {
          type: Schema.Types.ObjectId,
          ref: "Appointment",
        },
      },
      default: undefined,
      _id: false,
    },

    /** Poreklo izdavanja — za revert completion-a i audit */
    issuedByRuleId: { type: String },
    issuedByAdminId: { type: Schema.Types.ObjectId, ref: "TenantUser" },
    issuedForAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    issuedByEventId: { type: Schema.Types.ObjectId, ref: "LoyaltyEvent" },
  },
  { timestamps: true },
);

voucherSchema.index({ tenantId: 1, code: 1 }, { unique: true });
voucherSchema.index({ tenantId: 1, ownerTenantUserId: 1, status: 1 });
voucherSchema.index({ tenantId: 1, status: 1, expiresAt: 1 });
voucherSchema.index({ reservedAppointmentId: 1 }, { sparse: true });

export const Voucher = models.Voucher || model("Voucher", voucherSchema);
