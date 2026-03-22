import { Schema, Document, Types, model, models } from "mongoose";

const messageSchema = new Schema(
  {
    senderId: { type: Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["superadmin", "owner"], required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
);

export interface ISuperAdminChat extends Document {
  tenantId: Types.ObjectId;
  ownerId: Types.ObjectId;
  messages: {
    _id: Types.ObjectId;
    senderId: Types.ObjectId;
    senderRole: "superadmin" | "owner";
    message: string;
    isRead: boolean;
    timestamp: Date;
  }[];
  unreadBySuperAdmin: number;
  unreadByOwner: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SuperAdminChatSchema = new Schema<ISuperAdminChat>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messages: [messageSchema],
    unreadBySuperAdmin: { type: Number, default: 0 },
    unreadByOwner: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

SuperAdminChatSchema.index({ tenantId: 1, ownerId: 1 }, { unique: true });

export const SuperAdminChat =
  models.SuperAdminChat ||
  model<ISuperAdminChat>("SuperAdminChat", SuperAdminChatSchema);
