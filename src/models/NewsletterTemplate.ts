import { Schema, model, models } from "mongoose";

const NewsletterTemplateSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: false,
    },
    platformOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: false,
    },
    scope: {
      type: String,
      enum: ["tenant", "platform"],
      default: "tenant",
      index: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    subject: { type: String, required: true },
    htmlTemplate: { type: String, required: true },
    variables: [
      {
        name: String,
        label: String,
        type: {
          type: String,
          enum: [
            "text",
            "number",
            "email",
            "textarea",
            "image",
            "service",
            "price",
            "date",
            "datetime-local",
            "time",
            "url",
            "color",
          ],
        },
        required: Boolean,
        defaultValue: String,
        options: [String],
        placeholder: String,
        _id: false,
      },
    ],
    thumbnail: String,
    isActive: { type: Boolean, default: true },
    hasVariables: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const NewsletterTemplate =
  models.NewsletterTemplate ||
  model("NewsletterTemplate", NewsletterTemplateSchema);
