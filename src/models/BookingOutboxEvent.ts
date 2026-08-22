import { Schema, model, models } from "mongoose";

const bookingOutboxEventSchema = new Schema(
  {
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    reservationId: { type: Schema.Types.ObjectId, ref: "BookingReservation", required: true },
    lifecycleVersion: { type: Number, required: true },
    occurredAt: { type: Date, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    deliveryStatus: {
      type: String,
      enum: ["pending", "processing", "delivered", "failed"],
      default: "pending",
      required: true,
    },
    attempts: { type: Number, default: 0, required: true },
    lastError: { type: String },
    nextRetryAt: { type: Date },
  },
  { timestamps: true },
);

bookingOutboxEventSchema.index(
  { eventId: 1 },
  { unique: true, name: "booking_outbox_event_unique" },
);
bookingOutboxEventSchema.index(
  { deliveryStatus: 1, nextRetryAt: 1, createdAt: 1 },
  { name: "booking_outbox_delivery" },
);
bookingOutboxEventSchema.index(
  { tenantId: 1, reservationId: 1, lifecycleVersion: 1 },
  { name: "booking_outbox_reservation_lifecycle" },
);

export const BookingOutboxEvent =
  models.BookingOutboxEvent || model("BookingOutboxEvent", bookingOutboxEventSchema);
