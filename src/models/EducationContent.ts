// Mongoose model NIKADA ne sme u klijentski bundle: `mongoose.models` tamo ne
// postoji, pa uvoz iz klijentske komponente ruši stranicu. Domenske vrednosti
// zato žive u `@/types/education-content`, a ovaj marker pretvara budući
// klijentski uvoz u jasnu build grešku umesto u runtime pad.
import "server-only";

import { model, models, Schema, Types, type Document } from "mongoose";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import {
  EDUCATION_CONTENT_KINDS,
  EDUCATION_CONTENT_VISIBILITIES,
  EDUCATION_CONTENT_STATUSES,
  type EducationContentKind,
  type EducationContentStatus,
  type EducationContentVisibility,
} from "@/types/education-content";

/** Poslednja eksplicitno objavljena verzija — javni izvor istine. */
export interface IEducationPublishedSnapshot {
  title: string;
  slug: string;
  kind: EducationContentKind;
  visibility: EducationContentVisibility;
  blocks: ContentBlock[];
  seo?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
  publishedAt: Date;
}

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
  publishedSnapshot?: IEducationPublishedSnapshot | null;
  /** Kada je radna kopija poslednji put sačuvana (ne i objavljena). */
  workingSavedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Universal Marysoll Education content. NIJE NewsletterCampaign, blog, theme
 * blok, ponuda ni client assignment — assignment/ACL pripadaju kasnijoj fazi i
 * namerno ne postoje u ovoj šemi.
 *
 * DVE KOPIJE, BEZ ISTORIJE VERZIJA:
 *
 *   root polja        → tekuća radna kopija (authoring state)
 *   publishedSnapshot → poslednja objavljena verzija (javni izvor istine)
 *
 * Čuvanje menja samo radnu kopiju; objava je jedina granica koja radnu kopiju
 * promoviše u snapshot. Bez ovoga bi snimanje već objavljenog zapisa bilo
 * implicitna objava, jer bi javna strana čitala ista root polja.
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
    // Snapshot je namerno `_id: false` i bez sopstvenih default-a: on postoji
    // tek posle prve objave i uvek se piše ceo, nikad parcijalno.
    publishedSnapshot: {
      type: new Schema<IEducationPublishedSnapshot>(
        {
          title: { type: String, required: true },
          slug: { type: String, required: true },
          kind: { type: String, enum: EDUCATION_CONTENT_KINDS, required: true },
          visibility: {
            type: String,
            enum: EDUCATION_CONTENT_VISIBILITIES,
            required: true,
          },
          blocks: { type: Schema.Types.Mixed, default: [] },
          seo: {
            title: { type: String },
            description: { type: String },
            ogImage: { type: String },
          },
          publishedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    workingSavedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Tenant-first listanje.
EducationContentSchema.index({ tenantId: 1, updatedAt: -1 });
// Slug je jedinstven UNUTAR tenanta — nikada globalno.
EducationContentSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
// Javna projekcija (UI-3) čita ISKLJUČIVO snapshot, pa indeks prati snapshot,
// ne root polja.
EducationContentSchema.index({
  tenantId: 1,
  "publishedSnapshot.visibility": 1,
  "publishedSnapshot.publishedAt": -1,
});
// Dva objavljena zapisa istog tenanta ne smeju izložiti isti javni URL. Root
// slug se sme menjati odmah po snimanju, pa root indeks ovo ne pokriva.
EducationContentSchema.index(
  { tenantId: 1, "publishedSnapshot.slug": 1 },
  {
    unique: true,
    partialFilterExpression: { "publishedSnapshot.slug": { $type: "string" } },
  },
);

export const EducationContent =
  models.EducationContent ||
  model<IEducationContentDoc>("EducationContent", EducationContentSchema);
