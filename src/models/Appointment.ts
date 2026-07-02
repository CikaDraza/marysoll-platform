import { Schema, model, models, Types } from "mongoose";

// ─── Appointment ──────────────────────────────────────────────────────────────

const servicesSchema = new Schema(
  {
    serviceId: { type: Types.ObjectId, ref: "Service", required: true },
    quantity: { type: Number, default: 1 },
    serviceName: { type: String, required: true },
    price: Number,
    duration: { type: Number, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    sender: { type: String, enum: ["client", "admin"], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
);

const appointmentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    clientProfileId: { type: Schema.Types.ObjectId, ref: "TenantUser", required: true },
    staffProfileId: { type: Schema.Types.ObjectId, ref: "TenantUser" },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientPhone: { type: String, default: "" },
    clientInstagram: { type: String, default: "" },
    preferredContact: {
      type: String,
      enum: ["phone", "instagram", "email", "platform"],
    },
    contactNote: { type: String, default: "" },
    serviceName: { type: String, required: true },
    services: [servicesSchema],
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true },
    note: String,
    cancellationWindowHours: { type: Number, default: 1, min: 0 },
    cancellationStatus: {
      type: String,
      enum: ["can_cancel", "late_cancel"],
      default: "can_cancel",
    },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["client", "admin"] },
    cancellationType: { type: String, enum: ["legitimate", "late"] },
    noShowMarkedAt: { type: Date },
    noShowReason: {
      type: String,
      enum: ["late_cancel", "missed_appointment", "admin_marked"],
    },
    status: {
      type: String,
      enum: [
        "pending",
        "appointment_approved",
        "appointment_rejected",
        "appointment_rescheduled",
        "appointment_cancelled",
        "completed",
        "no_show",
      ],
      default: "pending",
    },
    messages: [messageSchema],
    lastSeen: { client: Date, admin: Date },
    unreadCount: {
      client: { type: Number, default: 0 },
      admin: { type: Number, default: 0 },
    },
    adminNotified: { type: Boolean, default: false },
    clientNotified: { type: Boolean, default: false },
    // Podsetnici (1 sat / 30 min pre termina) — dedupe da se ne šalju duplo
    reminderSent: {
      h1: { type: Boolean, default: false },
      m30: { type: Boolean, default: false },
    },
    proposedDate: String,
    proposedTime: String,
    lastUpdatedBy: { type: String, enum: ["client", "admin"] },

    // ── Growth Studio (loyalty) — sva polja opciona, backward-kompatibilna ──
    /** Primenjen vaučer (rezervisan pri bookingu, redeemed pri completion-u) */
    appliedVoucherId: { type: Schema.Types.ObjectId, ref: "Voucher" },
    appliedPromotionId: { type: Schema.Types.ObjectId, ref: "Promotion" },
    originalPrice: { type: Number },
    discountAmount: { type: Number },
    finalPrice: { type: Number },
    completedAt: { type: Date },
    completionSource: { type: String, enum: ["admin", "auto"] },
    /** Dvostepeni auto-complete: kada je adminu poslat prompt */
    completionPromptSentAt: { type: Date },
    // Dedup flagovi za loyalty obradu (pattern kao reminderSent).
    // revertCount raste pri svakom revertu completion-a — ulazi u event
    // sourceId da ponovni completion posle reverta može ponovo da nagradi.
    loyaltyProcessed: {
      completed: { type: Boolean, default: false },
      noShow: { type: Boolean, default: false },
      revertCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

appointmentSchema.index({ tenantId: 1, clientProfileId: 1 });
appointmentSchema.index({ tenantId: 1, date: 1 });
appointmentSchema.index({ tenantId: 1, cancellationStatus: 1 });
appointmentSchema.index({ tenantId: 1, status: 1, date: 1 });

export const Appointment =
  models.Appointment || model("Appointment", appointmentSchema);
