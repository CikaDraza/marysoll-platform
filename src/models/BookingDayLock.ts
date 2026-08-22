import { Schema, model, models } from "mongoose";

const bookingDayLockSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    resourceKey: { type: String, required: true },
    localDate: { type: String, required: true },
    version: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

bookingDayLockSchema.index(
  { tenantId: 1, resourceKey: 1, localDate: 1 },
  { unique: true, name: "booking_day_lock_unique" },
);

export const BookingDayLock =
  models.BookingDayLock || model("BookingDayLock", bookingDayLockSchema);
