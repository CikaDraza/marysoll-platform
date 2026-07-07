import { Schema, model, models } from "mongoose";

// ─── Growth Studio: persisted eventi (dedup gate + retry safety net) ──────────
// Nema pub/sub-a na Vercelu: event se upiše pa obradi sinhrono (try/catch),
// a cron sweeper retry-uje pending/failed. Unique {tenantId, type, sourceId}
// sprečava duplu obradu pri preklapanju poziva (ruta + cron).

const loyaltyEventSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    type: {
      type: String,
      enum: [
        "appointment_completed",
        "appointment_no_show",
        "appointment_completion_reverted",
        "appointment_cancelled",
        "client_registered",
        "client_checkin",
        "manual_adjustment",
      ],
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["appointment", "tenant_user", "admin"],
      required: true,
    },
    /**
     * Dedup ključ emisije. Za appointment evente uključuje ciklus obrade
     * ("{appointmentId}:c{revertCount}") da bi revert → ponovni completion
     * mogao ponovo da nagradi.
     */
    sourceId: { type: String, required: true },
    subjectTenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      required: true,
    },
    payload: { type: Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: ["pending", "processed", "failed", "skipped"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

loyaltyEventSchema.index({ tenantId: 1, type: 1, sourceId: 1 }, { unique: true });
loyaltyEventSchema.index({ status: 1, updatedAt: 1 });

export const LoyaltyEvent =
  models.LoyaltyEvent || model("LoyaltyEvent", loyaltyEventSchema);
