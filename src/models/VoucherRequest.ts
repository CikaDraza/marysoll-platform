import { model, models, Schema, Types } from "mongoose";

const voucherRequestSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: "Tenant", required: true },
    requestCode: { type: String, required: true },
    purchaserName: { type: String, required: true },
    purchaserInstagram: { type: String, required: true },
    recipientName: { type: String, required: true },
    serviceId: { type: Types.ObjectId, ref: "Service", required: true },
    serviceName: { type: String, required: true },
    servicePriceAtRequest: { type: Number, required: true },
    status: { type: String, enum: ["pending", "contacted", "fulfilled", "cancelled"], default: "pending" },
    notificationStatus: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

voucherRequestSchema.index({ tenantId: 1, requestCode: 1 }, { unique: true });
voucherRequestSchema.index({ tenantId: 1, purchaserInstagram: 1, createdAt: -1 });

export const VoucherRequest =
  models.VoucherRequest || model("VoucherRequest", voucherRequestSchema);
