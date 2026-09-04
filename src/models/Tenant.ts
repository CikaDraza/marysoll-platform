/**
 * Tenant model — represents a beauty salon on the platform.
 * Each tenant maps to one salon owner (isAdmin: true User).
 * All other models reference tenantId for data isolation.
 */
import { Schema, Document, Types, model, models } from "mongoose";
import {
  TENANT_CAPABILITIES,
  TENANT_VERTICALS,
  type TenantCapabilityConfiguration,
  type TenantVertical,
} from "@/types/tenant-capabilities";
import {
  EDUCATION_TAXONOMY_PRESETS,
  type EducationTaxonomyPreset,
} from "@/lib/education/taxonomy";

export interface ITenant extends Document {
  name: string;
  slug: string;
  subdomain: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  paid: boolean;
  verified: boolean;
  plan: "maria" | "claudia" | "kiki" | "enterprise";
  planExpiresAt: Date | null;
  /** Missing means legacy pre-T2B tenant; never add a persistence default. */
  verticals?: TenantVertical[];
  capabilityConfiguration?: TenantCapabilityConfiguration;
  /** Optional Education-domain selector. Missing/unknown never means skincare. */
  educationTaxonomyPreset?: EducationTaxonomyPreset;
  trialEndsAt: Date | null;
  isTrialActive: boolean;
  trialMode: "maria" | "card_required"; // how this tenant's trial was initiated
  trialRequiredCard: boolean; // true if card was provided at signup
  ownerId: Types.ObjectId;
  salonProfileId: Types.ObjectId | null;
  cloudinaryFolder: string;
  zohoOrgId?: string;
  emailInboxProvider?: "none" | "zoho";
  emailInboxStatus?: "not_configured" | "mx_detected" | "mailbox_verified";
  verifiedInboxEmails?: string[];
  emailHostingProvider?: "none" | "zoho" | "google" | "microsoft" | "other";
  emailHostingStatus?: "not_configured" | "mx_detected" | "verified";
  emailInboxDomain?: string;
  lemonsqueezyCustomerId: string | null;
  lemonsqueezySubscriptionId: string | null;
  aiSettings: {
    chatEnabled: boolean;
    landingEnabled: boolean;
    imageEnabled: boolean;
    chatRpmLimit: number;
    landingRpmLimit: number;
    imageRpmLimit: number;
  };
  storageMetrics: {
    mongoUsageMb: number;
    cloudinaryUsageMb: number;
    updatedAt: Date;
  };
  status: "active" | "suspended" | "pending" | "cancelled";
  isDemo: { type: boolean; default: false };
  createdAt: Date;
  updatedAt: Date;
}

const TenantCapabilityOverrideSchema = new Schema(
  {
    capability: {
      type: String,
      enum: TENANT_CAPABILITIES,
      required: true,
    },
    enabled: { type: Boolean, required: true },
  },
  { _id: false },
);

const TenantCapabilityConfigurationSchema = new Schema(
  {
    overrides: {
      type: [TenantCapabilityOverrideSchema],
      default: undefined,
      validate: {
        validator: (overrides: TenantCapabilityConfiguration["overrides"]) =>
          overrides === undefined ||
          new Set(overrides.map((override) => override.capability)).size ===
            overrides.length,
        message: "Capability override-i ne smeju biti duplirani",
      },
    },
  },
  { _id: false },
);

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    // unique:true creates index automatically — no need for schema.index({ slug: 1 })
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subdomain: { type: String, required: true, unique: true, lowercase: true },
    // sparse: true sa unique — OK, nema duplikata
    customDomain: { type: String, default: null, unique: true, sparse: true },
    customDomainVerified: { type: Boolean, default: false },
    paid: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    plan: {
      type: String,
      enum: ["maria", "claudia", "kiki", "enterprise"],
      default: "maria",
    },
    verticals: {
      type: [String],
      enum: TENANT_VERTICALS,
      default: undefined,
      validate: [
        {
          validator: (verticals: TenantVertical[] | undefined) =>
            verticals === undefined || verticals.length > 0,
          message: "Tenant mora imati najmanje jednu vertikalu",
        },
        {
          validator: (verticals: TenantVertical[] | undefined) =>
            verticals === undefined ||
            new Set(verticals).size === verticals.length,
          message: "Vertikale ne smeju biti duplirane",
        },
      ],
    },
    capabilityConfiguration: {
      type: TenantCapabilityConfigurationSchema,
      default: undefined,
      set: (
        configuration: TenantCapabilityConfiguration | undefined,
      ): TenantCapabilityConfiguration | undefined =>
        configuration === undefined
          ? undefined
          : { overrides: configuration.overrides ?? [] },
    },
    educationTaxonomyPreset: {
      type: String,
      enum: EDUCATION_TAXONOMY_PRESETS,
      default: undefined,
    },
    planExpiresAt: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    isTrialActive: { type: Boolean, default: false },
    trialMode: {
      type: String,
      enum: ["maria", "card_required"],
      default: "maria",
    },
    trialRequiredCard: { type: Boolean, default: false },
    ownerId: { type: Schema.Types.ObjectId, ref: "AuthUser", required: true },
    salonProfileId: {
      type: Schema.Types.ObjectId,
      ref: "SalonProfile",
      default: null,
    },
    cloudinaryFolder: { type: String, required: true },
    zohoOrgId: { type: String, default: "" },
    emailInboxProvider: {
      type: String,
      enum: ["none", "zoho"],
      default: "none",
    },
    emailInboxStatus: {
      type: String,
      enum: ["not_configured", "mx_detected", "mailbox_verified"],
      default: "not_configured",
    },
    verifiedInboxEmails: { type: [String], default: [] },
    emailHostingProvider: {
      type: String,
      enum: ["none", "zoho", "google", "microsoft", "other"],
      default: "none",
    },
    emailHostingStatus: {
      type: String,
      enum: ["not_configured", "mx_detected", "verified"],
      default: "not_configured",
    },
    emailInboxDomain: { type: String, default: "" },
    lemonsqueezyCustomerId: { type: String, default: null },
    lemonsqueezySubscriptionId: { type: String, default: null },
    aiSettings: {
      chatEnabled: { type: Boolean, default: true },
      landingEnabled: { type: Boolean, default: true },
      imageEnabled: { type: Boolean, default: true },
      chatRpmLimit: { type: Number, default: 10 },
      landingRpmLimit: { type: Number, default: 5 },
      imageRpmLimit: { type: Number, default: 3 },
      _id: false,
    },
    storageMetrics: {
      mongoUsageMb: { type: Number, default: 0 },
      cloudinaryUsageMb: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
      _id: false,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

TenantSchema.index({ status: 1, ownerId: 1 });

// Self-heal legacy `trialMode`: stariji tenanti imaju vrednost "free" (van
// trenutnog enuma ["maria","card_required"]). Bez ovoga svaki `tenant.save()`
// (superadmin trial/plan/status akcije) pukne na validaciji → 500 "Server error".
// pre("validate") mora — validacija se izvršava pre save-a; coercija ovde čini
// dokument validnim i usput trajno očisti staru vrednost pri prvom snimanju.
TenantSchema.pre("validate", function (next) {
  // Missing T2B fields are reserved exclusively for hydrated legacy records.
  // Every newly-created Tenant must go through the shared provisioning helper.
  if (this.isNew && this.verticals === undefined) {
    this.invalidate(
      "verticals",
      "Novi Tenant mora eksplicitno imati verticals",
    );
  }
  if (this.isNew && this.capabilityConfiguration === undefined) {
    this.invalidate(
      "capabilityConfiguration",
      "Novi Tenant mora eksplicitno imati capability konfiguraciju",
    );
  }

  const mode = this.trialMode as unknown as string;
  if (mode !== "maria" && mode !== "card_required") {
    this.trialMode = "maria";
  }
  next();
});

export const Tenant = models.Tenant || model<ITenant>("Tenant", TenantSchema);
