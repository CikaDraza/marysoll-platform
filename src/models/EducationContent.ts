import { model, models, Schema, Types, type Document } from "mongoose";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";

export const EDUCATION_CONTENT_KINDS = [
  "advice",
  "article",
  "guide",
  "video",
  "material",
] as const;

export const EDUCATION_CONTENT_VISIBILITIES = ["public", "private"] as const;
export const EDUCATION_CONTENT_STATUSES = ["draft", "published"] as const;

export type EducationContentKind = (typeof EDUCATION_CONTENT_KINDS)[number];
export type EducationContentVisibility =
  (typeof EDUCATION_CONTENT_VISIBILITIES)[number];
export type EducationContentStatus = (typeof EDUCATION_CONTENT_STATUSES)[number];

export interface IEducationContentDoc extends Document {
  tenantId: Types.ObjectId;
  title: string;
  slug: string;
  kind: EducationContentKind;
  visibility: EducationContentVisibility;
  status: EducationContentStatus;
  blocks: ContentBlock[];
  seo?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Universal Marysoll Education content. NIJE NewsletterCampaign, blog, theme
 * blok, ponuda ni client assignment — assignment/ACL pripadaju kasnijoj fazi i
 * namerno ne postoje u ovoj šemi.
 *
 * `blocks` je `Mixed` iz istog razloga kao newsletter `landingPage.layout`:
 * Content Composer je vlasnik oblika bloka, pa Mongoose ne sme da odseca polja
 * koja shared validator smatra validnim.
 */
const EducationContentSchema = new Schema<IEducationContentDoc>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: EDUCATION_CONTENT_KINDS,
      required: true,
      default: "article",
    },
    // Vidljivost je nezavisna od lifecycle-a: `published` ne znači javno.
    visibility: {
      type: String,
      enum: EDUCATION_CONTENT_VISIBILITIES,
      required: true,
      default: "public",
    },
    status: {
      type: String,
      enum: EDUCATION_CONTENT_STATUSES,
      required: true,
      default: "draft",
    },
    blocks: { type: Schema.Types.Mixed, default: [] },
    seo: {
      title: { type: String },
      description: { type: String },
      ogImage: { type: String },
    },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Tenant-first listanje.
EducationContentSchema.index({ tenantId: 1, updatedAt: -1 });
// Slug je jedinstven UNUTAR tenanta — nikada globalno.
EducationContentSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
// Buduća javna projekcija (UI-3) uvek traži sve tri dimenzije zajedno.
EducationContentSchema.index({ tenantId: 1, status: 1, visibility: 1 });

export const EducationContent =
  models.EducationContent ||
  model<IEducationContentDoc>("EducationContent", EducationContentSchema);
