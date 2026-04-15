import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAudienceContact extends Document {
  email: string;

  firstName?: string;
  lastName?: string;

  tenantId?: Types.ObjectId;   // salon tenant for campaign targeting
  profileId?: Types.ObjectId;  // TenantUser reference if registered

  contactType:
    | "CLIENT"
    | "NEWSLETTER"
    | "SALON_OWNER"
    | "LEAD"
    | "STAFF";

  source:
    | "user"
    | "newsletter"
    | "import"
    | "linkedin"
    | "scraper"
    | "manual";

  tags: string[];

  status: "ACTIVE" | "UNSUBSCRIBED" | "BOUNCED";

  subscribed: boolean;
  unsubscribedAt?: Date;

  lastEmailSent?: Date;

  verificationToken?: string;
  unsubscribeToken?: string;

  openCount: number;
  clickCount: number;
  engagementScore: number;

  createdAt: Date;
  updatedAt: Date;
}

const AudienceContactSchema = new Schema<IAudienceContact>(
  {
    email: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
    profileId: { type: Schema.Types.ObjectId, ref: "TenantUser" },
    contactType: {
      type: String,
      enum: ["CLIENT", "NEWSLETTER", "SALON_OWNER", "LEAD", "STAFF"],
      required: true,
    },
    source: {
      type: String,
      enum: ["user", "newsletter", "import", "linkedin", "scraper", "manual"],
      required: true,
    },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["ACTIVE", "UNSUBSCRIBED", "BOUNCED"],
      default: "ACTIVE",
    },
    subscribed: { type: Boolean, default: true },
    unsubscribedAt: { type: Date },
    lastEmailSent: { type: Date },
    verificationToken: { type: String },
    unsubscribeToken: { type: String },
    openCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

AudienceContactSchema.index({ email: 1, tenantId: 1 }, { unique: true });
AudienceContactSchema.index({ tenantId: 1 });

export const AudienceContact: Model<IAudienceContact> =
  mongoose.models.AudienceContact ||
  mongoose.model("AudienceContact", AudienceContactSchema);
