import { model, Schema, Document, models, Types } from "mongoose";

export interface IServiceDoc extends Document {
  tenantId: Types.ObjectId;
  name: string;
  category: string;
  subcategory?: string;
  type: "single" | "group" | "variant";
  basePrice?: number;
  duration?: number;
  description?: string;
  services?: {
    name: string;
    price?: number;
    duration: number;
    description?: string;
  }[];
  variants?: {
    name: string;
    price: number;
    duration: number;
    perItem: boolean;
  }[];
  extras?: {
    name: string;
    price: number;
    duration: number;
    perItem: boolean;
  }[];
  subscription?: {
    enabled: boolean;
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
    subcategory: { type: String },
    type: {
      type: String,
      enum: ["single", "group", "variant"],
      required: true,
    },
    basePrice: Number,
    duration: Number,
    description: String,
    services: [
      { name: String, price: Number, duration: Number, description: String },
    ],
    variants: [
      {
        name: String,
        price: Number,
        duration: Number,
        perItem: { type: Boolean, default: false },
      },
    ],
    extras: [
      {
        name: String,
        price: Number,
        duration: Number,
        perItem: { type: Boolean, default: false },
      },
    ],
    subscription: {
      enabled: { type: Boolean, default: false },
      priceMonthly: Number,
      startDate: Date,
      endDate: Date,
    },
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
