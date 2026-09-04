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
    additionalPrice?: number;
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
    unitLabel?: string;
    allowQuantity?: boolean;
  }[];
  subscription?: {
    enabled: boolean;
    subscriptionType?: "monthly" | "package";
    treatmentCount?: number;
    priceMonthly?: number;
    startDate?: Date;
    endDate?: Date;
  };
  bookingIntake?: { enabled: boolean };
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
        // Puna cena varijante (fixed) — značenje se ne menja.
        price: Number,
        // Doplata na basePrice korena, samo kada je koren "from".
        additionalPrice: Number,
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
        // Jedinica mere ("kom", "nokat", "set") i da li se bira količina.
        unitLabel: String,
        allowQuantity: { type: Boolean, default: false },
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
    // Traži li usluga da klijentkinja pošalje šta želi (fotografija/link/opis).
    // VLASNIK odluke je usluga, ne kategorija — vidi PANTA-SERVICE-INTAKE.md.
    bookingIntake: {
      enabled: { type: Boolean, default: false },
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
