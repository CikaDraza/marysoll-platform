import { Schema, model, models } from "mongoose";

// ─── Namera naplate ───────────────────────────────────────────────────────────
//
// JEDNA po pokušaju naplate određenog iznosa za određenu svrhu — ne jedna po
// terminu. Depozit i ostatak su dve namere nad istim terminom, i to je ceo
// smisao: račun se zatvara u dva dela, nikad povraćajem pa ponovnom naplatom.
//
// Faza 1 radi isključivo sa `provider: "manual"` (salon beleži keš ili uplatu
// na račun). Ceo domen se time dokazuje pre nego što ijedan novac prođe kroz
// treću stranu.

const pricedAgainstSchema = new Schema(
  {
    /**
     * Osnovica nad kojom je iznos izračunat, zamrznuta pri kreiranju.
     *
     * Čim je novac naplaćen, pogodnost prestaje da bude preferenca i postaje
     * DOKAZ: ne sme se ukloniti dok naplata stoji. Isti razlog kao
     * `Voucher.pointsShopSnapshot`.
     */
    preBenefitAmountMinor: { type: Number, default: null },
    benefitVoucherId: { type: Schema.Types.ObjectId, ref: "Voucher", default: null },
    benefitDiscountMinor: { type: Number, default: null },
    amountDueMinor: { type: Number, default: null },
    /** Otisak izbora usluge — promena usluge posle naplate mora biti vidljiva. */
    servicesFingerprint: { type: String, default: null },
  },
  { _id: false },
);

const paymentIntentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    clientTenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      default: null,
    },

    /**
     * Svrha odlučuje politiku povraćaja i sme li naplata ikad da piše
     * `chargedAmount`. Namerno NIJE boolean `isDeposit`.
     */
    purpose: {
      type: String,
      enum: [
        "appointment_deposit",
        "appointment_balance",
        "appointment_full",
        "package_purchase",
      ],
      required: true,
    },

    /** Polimorfna veza, isti oblik kao `BookingReservation.domainRef`. */
    subject: {
      type: {
        type: String,
        enum: ["appointment", "client_package"],
        required: true,
      },
      id: { type: Schema.Types.ObjectId, required: true },
    },

    /** Traženi iznos u MINOR UNITS, zamrznut pri kreiranju. */
    amountMinor: { type: Number, required: true },
    currency: { type: String, default: "RSD" },

    pricedAgainst: { type: pricedAgainstSchema, default: undefined },

    /** Uslovi depozita na snazi pri kreiranju — dokaz u sporu. */
    policySnapshot: { type: Schema.Types.Mixed, default: undefined },

    status: {
      type: String,
      enum: [
        "requires_payment",
        "processing",
        "settled",
        "failed",
        "expired",
        "cancelled",
        "refunded",
      ],
      default: "requires_payment",
    },
    statusReason: { type: String, default: null },
    /** Zahtev za depozit mora da umre; TTL je product odluka. */
    expiresAt: { type: Date, default: null },

    /** `"manual"` = salon je zabeležio keš/uplatu. Jedan ledger za sav novac. */
    provider: { type: String, enum: ["manual"], default: "manual" },
    providerRef: { type: Schema.Types.Mixed, default: undefined },

    /** Dupli klik na „Plati" ne sme da iskuje dve namere. */
    idempotencyKey: { type: String, required: true },
    createdByTenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      default: null,
    },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentIntentSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, name: "payment_intent_idempotency_unique" },
);
paymentIntentSchema.index({ tenantId: 1, "subject.type": 1, "subject.id": 1, createdAt: -1 });
paymentIntentSchema.index({ tenantId: 1, status: 1 });

export const PaymentIntent =
  models.PaymentIntent || model("PaymentIntent", paymentIntentSchema);
