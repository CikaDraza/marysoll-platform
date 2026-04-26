import { model, Schema, Document, models, Types } from "mongoose";

export interface ISlotDoc extends Document {
  salonId: Types.ObjectId;
  serviceId?: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: "free" | "reserved" | "booked";
  expiresAt?: Date;
}

const SlotSchema = new Schema<ISlotDoc>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: "SalonProfile", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["free", "reserved", "booked"],
      default: "free",
      required: true,
    },
    // Only set when status = "reserved" — reservation expires after 5 min
    expiresAt: { type: Date },
  },
  { timestamps: false },
);

// Primary query index: marketplace salons aggregation
SlotSchema.index({ salonId: 1, status: 1, startTime: 1 });

// Unique constraint — prevents duplicate slot insertion
SlotSchema.index({ salonId: 1, startTime: 1 }, { unique: true });

export const Slot = models.Slot || model<ISlotDoc>("Slot", SlotSchema);
