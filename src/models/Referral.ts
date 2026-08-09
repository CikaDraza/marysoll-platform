import { Schema, model, models } from "mongoose";

// Referral nastaje tek kada registrovana prijateljica rezerviše termin gift
// vaučerom. Nagrada se ne dodeljuje ovde, već posle prvog completed termina.
const referralSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    referrerTenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      required: true,
    },
    referredTenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      required: true,
    },
    sourceVoucherId: {
      type: Schema.Types.ObjectId,
      ref: "Voucher",
      required: true,
    },
    firstAppointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    status: {
      type: String,
      enum: ["booked", "completed", "rewarded", "invalidated"],
      default: "booked",
    },
    failureReason: { type: String },
    completedAt: { type: Date },
    rewardGiven: { type: Boolean, default: false },
    rewardPoints: { type: Number, default: 0, min: 0 },
    rewardGivenAt: { type: Date },
  },
  { timestamps: true },
);

referralSchema.index({ tenantId: 1, sourceVoucherId: 1 }, { unique: true });
referralSchema.index({ tenantId: 1, firstAppointmentId: 1 }, { unique: true });
referralSchema.index({ tenantId: 1, referredTenantUserId: 1, status: 1 });
referralSchema.index({ tenantId: 1, referrerTenantUserId: 1, status: 1 });

export const Referral = models.Referral || model("Referral", referralSchema);
