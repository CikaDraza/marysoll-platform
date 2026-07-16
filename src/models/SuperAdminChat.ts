import { Schema, Document, Types, model, models } from "mongoose";
import type { IChatAttachment } from "@/types";

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "pdf"], required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    senderId: { type: Types.ObjectId, ref: "AuthUser", required: true },
    senderRole: { type: String, enum: ["superadmin", "owner"], required: true },
    message: { type: String, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
);

interface ISuperAdminChat extends Document {
  tenantId: Types.ObjectId;
  ownerId: Types.ObjectId;
  messages: {
    _id: Types.ObjectId;
    senderId: Types.ObjectId;
    senderRole: "superadmin" | "owner";
    message: string;
    attachments: IChatAttachment[];
    isDeleted: boolean;
    isRead: boolean;
    timestamp: Date;
  }[];
  unreadBySuperAdmin: number;
  unreadByOwner: number;
  lastMessageAt: Date;
  /** Email throttle: kada je poslednji email poslat superadminu (reset kad pročita). */
  superAdminEmailThrottleAt?: Date | null;
  /** Email throttle: kada je poslednji email poslat owneru (reset kad pročita). */
  ownerEmailThrottleAt?: Date | null;
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
    ownerId: { type: Schema.Types.ObjectId, ref: "AuthUser", required: true },
    messages: [messageSchema],
    unreadBySuperAdmin: { type: Number, default: 0 },
    unreadByOwner: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
    superAdminEmailThrottleAt: { type: Date, default: null },
    ownerEmailThrottleAt: { type: Date, default: null },
  },
  { timestamps: true },
);

SuperAdminChatSchema.index({ tenantId: 1, ownerId: 1 }, { unique: true });

export const SuperAdminChat =
  models.SuperAdminChat ||
  model<ISuperAdminChat>("SuperAdminChat", SuperAdminChatSchema);
