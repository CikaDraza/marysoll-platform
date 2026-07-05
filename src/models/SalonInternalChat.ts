import { Schema, Document, Types, model, models } from "mongoose";
import type { IChatAttachment } from "@/types";

export interface IChatMessage {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderRole: string;
  content: string;
  attachments: IChatAttachment[];
  isDeleted: boolean;
  timestamp: Date;
}

interface ISalonInternalChat extends Document {
  tenantId: Types.ObjectId;
  // Sorted [smaller, larger] for uniqueness — compound unique index
  participants: [Types.ObjectId, Types.ObjectId];
  messages: IChatMessage[];
  // Map of tenantUserId → unread count
  unreadCount: Map<string, number>;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IChatAttachment>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "pdf"], required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema<IChatMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "TenantUser", required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    content: { type: String, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
);

const SalonInternalChatSchema = new Schema<ISalonInternalChat>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    participants: {
      type: [Schema.Types.ObjectId],
      validate: (v: Types.ObjectId[]) => v.length === 2,
      required: true,
    },
    messages: { type: [messageSchema], default: [] },
    unreadCount: { type: Map, of: Number, default: {} },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Guarantee one chat per pair within a tenant
SalonInternalChatSchema.index(
  { tenantId: 1, "participants.0": 1, "participants.1": 1 },
  { unique: true },
);

export const SalonInternalChat =
  models.SalonInternalChat ||
  model<ISalonInternalChat>("SalonInternalChat", SalonInternalChatSchema);
