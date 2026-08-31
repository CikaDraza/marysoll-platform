import { model, Schema, Document, models, Types } from "mongoose";

interface IServiceDoc extends Document {
  tenantId: Types.ObjectId;
  name: string;
  category: string;
  categorySlug?: string;
  subcategory?: string;
  type: "single" | "group" | "variant";
  basePrice?: number;
  priceMode?: "fixed" | "on_request" | "from";
  duration?: number;
  description?: string;
  icon?: string;
  services?: {
    name: string;
    price?: number;
    priceMode?: "fixed" | "on_request" | "from";
    duration: number;
    description?: string;
  }[];
  variants?: {
    name: string;
    price: number;
    priceMode?: "fixed" | "on_request" | "from";
    duration: number;
    perItem: boolean;
    description?: string;
  }[];
  extras?: {
    name: string;
    price: number;
    priceMode?: "fixed" | "on_request" | "from";
    duration: number;
    perItem: boolean;
  }[];
  subscription?: {
    enabled: boolean;
    subscriptionType?: "monthly" | "package";
    treatmentCount?: number;
    priceMonthly?: number;
    startDate?: Date;
    endDate?: Date;
  };
  items: string[];
  featured?: "main" | "second" | "third" | "none";
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IServiceDoc>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    name: { type: String, required: true },
    category: { type: String, required: true },
    categorySlug: { type: String },
    subcategory: { type: String },
    type: {
      type: String,
      enum: ["single", "group", "variant"],
      required: true,
    },
    basePrice: Number,
    priceMode: {
      type: String,
      enum: ["fixed", "on_request", "from"],
      default: "fixed",
    },
    duration: Number,
    description: String,
    services: [
      {
        name: String,
        price: Number,
        priceMode: {
          type: String,
          enum: ["fixed", "on_request", "from"],
          default: "fixed",
        },
        duration: Number,
        description: String,
      },
    ],
    variants: [
      {
        name: String,
        price: Number,
        priceMode: {
          type: String,
          enum: ["fixed", "on_request", "from"],
          default: "fixed",
        },
        duration: Number,
        perItem: { type: Boolean, default: false },
        description: String,
      },
    ],
    extras: [
      {
        name: String,
        price: Number,
        priceMode: {
          type: String,
          enum: ["fixed", "on_request", "from"],
          default: "fixed",
        },
        duration: Number,
        perItem: { type: Boolean, default: false },
      },
    ],
    subscription: {
      enabled: { type: Boolean, default: false },
      subscriptionType: {
        type: String,
        enum: ["monthly", "package"],
        default: "monthly",
      },
      treatmentCount: Number,
      priceMonthly: Number,
      startDate: Date,
      endDate: Date,
    },
    icon: { type: String },
    items: [{ type: String }],
    featured: {
      type: String,
      enum: ["main", "second", "third", "none"],
      default: "main",
    },
  },
  { timestamps: true },
);

export const Service =
  models.Service || model<IServiceDoc>("Service", ServiceSchema);
