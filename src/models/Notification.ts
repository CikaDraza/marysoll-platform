import { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    recipientProfileId: { type: Schema.Types.ObjectId, ref: "TenantUser", required: true },
    type: {
      type: String,
      enum: [
        "appointment_created",
        "appointment_approved",
        "appointment_rejected",
        "appointment_rescheduled",
        "appointment_cancelled",
        "appointment_message",
        "testimonial_created",
        "testimonial_replied",
        "testimonial_updated",
        "testimonial_deleted",
        "testimonial_message",
        "chat_message",
        "generic",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    testimonialId: { type: Schema.Types.ObjectId, ref: "Testimonial" },
    metadata: {
      oldDate: String,
      oldTime: String,
      newDate: String,
      newTime: String,
      sender: { type: String, enum: ["client", "admin"] },
      clientProfileId: String,
      serviceName: String,
      clientName: String,
      rating: Number,
      _id: false,
    },
  },
  { timestamps: true },
);

export const Notification =
  models.Notification || model("Notification", NotificationSchema);
