import { Schema, model, models } from "mongoose";

// ─── Testimonial ──────────────────────────────────────────────────────────────

const TestimonialSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    clientProfileId: { type: Schema.Types.ObjectId, ref: "TenantUser", required: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    adminReply: { type: String },
    isApproved: { type: Boolean, default: false }, // admin must approve before public
    isRead: { type: Boolean, default: false },
    isClientRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Testimonial =
  models.Testimonial || model("Testimonial", TestimonialSchema);
