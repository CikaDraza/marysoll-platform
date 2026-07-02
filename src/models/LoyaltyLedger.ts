import { Schema, model, models } from "mongoose";

// ─── Growth Studio: append-only knjiga promena (nikad mutable balans) ─────────
// Poeni/srca su liability i trust proizvod: klijent vidi istoriju verbatim,
// sporovi se rešavaju čitanjem ledger-a, admin izmene nose obavezan razlog.
// Unique {tenantId, idempotencyKey} je celokupna retry/concurrency priča —
// ponovna obrada istog događaja je no-op (E11000 → preskoči).

const loyaltyLedgerSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "LoyaltyAccount",
      required: true,
    },
    tenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      required: true,
    },

    entryType: {
      type: String,
      enum: ["earn", "redeem", "adjust", "revoke", "expire"],
      required: true,
    },
    currency: { type: String, enum: ["hearts", "points"], required: true },
    /** Označen iznos: earn > 0, redeem/revoke/expire < 0, adjust bilo koji */
    amount: { type: Number, required: true },

    source: {
      eventId: { type: Schema.Types.ObjectId, ref: "LoyaltyEvent" },
      /** "builtin:hearts_per_visit" ili ObjectId string LoyaltyRule-a */
      ruleId: { type: String },
      ruleVersion: { type: Number },
      voucherId: { type: Schema.Types.ObjectId, ref: "Voucher" },
      appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
      adminUserId: { type: Schema.Types.ObjectId, ref: "TenantUser" },
      /** Obavezan kod adjust unosa */
      reason: { type: String },
    },

    idempotencyKey: { type: String, required: true },
    /** Srpski opis vidljiv klijentu u istoriji ("Završena poseta: Gel lak") */
    description: { type: String, required: true },
  },
  { timestamps: true },
);

loyaltyLedgerSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true });
loyaltyLedgerSchema.index({ tenantId: 1, accountId: 1, createdAt: -1 });
loyaltyLedgerSchema.index({ tenantId: 1, "source.appointmentId": 1 });

export const LoyaltyLedger =
  models.LoyaltyLedger || model("LoyaltyLedger", loyaltyLedgerSchema);
