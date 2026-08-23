import { Schema, model, models } from "mongoose";

const bookingOperationReceiptSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    operationType: {
      type: String,
      enum: ["reserve", "reschedule", "cancel", "reject", "complete", "mark_no_show"],
      required: true,
    },
    idempotencyKey: { type: String, required: true },
    fingerprint: { type: String, required: true },
    reservationId: { type: Schema.Types.ObjectId, ref: "BookingReservation", required: true },
    result: { type: Schema.Types.Mixed, required: true },
    lifecycleVersion: { type: Number, required: true },
    eventId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

bookingOperationReceiptSchema.index(
  { tenantId: 1, operationType: 1, idempotencyKey: 1 },
  { unique: true, name: "booking_operation_receipt_unique" },
);

export const BookingOperationReceipt =
  models.BookingOperationReceipt ||
  model("BookingOperationReceipt", bookingOperationReceiptSchema);
