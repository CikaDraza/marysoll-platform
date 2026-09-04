import { Schema, model, models } from "mongoose";

// ─── Knjiga novca (append-only) ───────────────────────────────────────────────
//
// Doslovno obrazac `LoyaltyLedger`-a, jedinog dokazanog idempotency mehanizma
// u ovom repou: unique {tenantId, idempotencyKey}.
//
// PRATI SAMO NOVAC KOJI JE PROŠAO KROZ PLATFORMU. Ono što je salon naplatio
// direktno (keš u salonu, uplata na svoj račun) ovde se NE pojavljuje —
// razlika `chargedAmount − Σ zapisa` je upravo salonov direktan prihod.
//
// Nema keširanog salda nigde. Svaki saldo je `$sum` po indeksiranom polju:
// `LoyaltyAccount` kešira balans i baš zato mu treba `loyalty.balance.mismatch`
// provera — to se ne ponavlja tamo gde drift nije kozmetika.

const paymentLedgerSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    intentId: { type: Schema.Types.ObjectId, ref: "PaymentIntent", required: true },

    /** Denormalizovano da poravnanje termina bude jedan indeksiran upit. */
    subject: {
      type: {
        type: String,
        enum: ["appointment", "client_package"],
        required: true,
      },
      id: { type: Schema.Types.ObjectId, required: true },
    },

    entryType: {
      type: String,
      enum: ["capture", "refund", "forfeit", "fee", "payout", "adjust"],
      required: true,
    },
    /** SA PREDZNAKOM: naplata > 0, povraćaj/naknada/isplata < 0. */
    amountMinor: { type: Number, required: true },
    currency: { type: String, default: "RSD" },

    /**
     * Gde novac stoji. Bez ovoga nema odgovora „šta dugujemo salonu na kraju
     * meseca" — a to je cela operativna posledica MoR odluke.
     */
    account: {
      type: String,
      enum: ["client_funds", "salon_payable", "platform_revenue", "provider_fee"],
      required: true,
    },

    /** Provajderov trenutak, ne `createdAt`. */
    occurredAt: { type: Date, default: Date.now },

    source: {
      webhookEventId: { type: Schema.Types.ObjectId, ref: "WebhookEvent" },
      providerEventId: { type: String },
      adminUserId: { type: Schema.Types.ObjectId, ref: "TenantUser" },
      /** Obavezan kod `adjust` — isto pravilo kao u LoyaltyLedger-u. */
      reason: { type: String },
    },

    idempotencyKey: { type: String, required: true },
    /** Srpski opis vidljiv klijentkinji — isti trust ugovor kao loyalty. */
    description: { type: String, required: true },
  },
  { timestamps: true },
);

paymentLedgerSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true });
paymentLedgerSchema.index({ tenantId: 1, "subject.type": 1, "subject.id": 1 });
paymentLedgerSchema.index({ tenantId: 1, account: 1, occurredAt: -1 });

export const PaymentLedger =
  models.PaymentLedger || model("PaymentLedger", paymentLedgerSchema);
