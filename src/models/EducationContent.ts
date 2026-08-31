// Mongoose model NIKADA ne sme u klijentski bundle: `mongoose.models` tamo ne
// postoji, pa uvoz iz klijentske komponente ruši stranicu. Domenske vrednosti
// zato žive u `@/types/education-content`, a ovaj marker pretvara budući
// klijentski uvoz u jasnu build grešku umesto u runtime pad.
import "server-only";

import { model, models, Schema, Types, type Document } from "mongoose";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import {
  EDUCATION_ACCESS_MODES,
  EDUCATION_CONTENT_KINDS,
  EDUCATION_CONTENT_STATUSES,
  EDUCATION_CONTENT_VISIBILITIES,
  type EducationAccessMode,
  type EducationContentKind,
  type EducationContentStatus,
  type EducationContentVisibility,
} from "@/types/education-content";

/** Poslednja eksplicitno objavljena verzija — javni izvor istine. */
export interface IEducationHero {
  subtitle?: string;
  image?: {
    src: string;
    alt?: string;
    focalPoint?: { x: number; y: number };
  };
}

export interface IEducationPublicPreview {
  title?: string;
  description?: string;
  coverImage?: string;
}

export interface IEducationPublishedSnapshot {
  title: string;
  slug: string;
  kind: EducationContentKind;
  accessMode?: EducationAccessMode;
  /** Zatečeno dvočlano polje; čita se samo kad `accessMode` nedostaje. */
  visibility?: EducationContentVisibility;
  /** Naslovna sekcija zamrznuta pri objavi. */
  hero?: IEducationHero;
  /** Javni pregled za `gated` — jedini deo koji neautorizovan čitalac vidi. */
  publicPreview?: IEducationPublicPreview;
  /** Naslovna slika sa fokusom kadra; računa se pri objavi. */
  cover?: { src: string; focalPoint?: { x: number; y: number } };
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
  accessMode?: EducationAccessMode;
  /** Zatečeno dvočlano polje; čita se samo kad `accessMode` nedostaje. */
  visibility?: EducationContentVisibility;
  hero?: IEducationHero;
  publicPreview?: IEducationPublicPreview;
  status: EducationContentStatus;
  blocks: ContentBlock[];
  seo?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
  publishedSnapshot?: IEducationPublishedSnapshot | null;
  /** Ranije objavljene JAVNE adrese ovog zapisa — izvor 301 preusmerenja. */
  publishedSlugHistory?: string[];
  /** Kada je radna kopija poslednji put sačuvana (ne i objavljena). */
  workingSavedAt?: Date | null;
  /** Editor sesija i redni broj poslednjeg prihvaćenog čuvanja. */
  workingSessionId?: string | null;
  workingRevision?: number | null;
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
    // Režim pristupa je nezavisan od lifecycle-a: `published` ne znači javno.
    accessMode: {
      type: String,
      enum: EDUCATION_ACCESS_MODES,
      default: "public",
    },
    // Zatečeno polje: ostaje opcionо dok backfill ne prevede stare zapise.
    visibility: {
      type: String,
      enum: EDUCATION_CONTENT_VISIBILITIES,
    },
    // Naslovna sekcija — jedan izvor istine za karticu i za zaglavlje strane.
    hero: {
      subtitle: { type: String },
      image: {
        src: { type: String },
        alt: { type: String },
        focalPoint: { x: { type: Number }, y: { type: Number } },
      },
    },
    publicPreview: {
      title: { type: String },
      description: { type: String },
      coverImage: { type: String },
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
          accessMode: { type: String, enum: EDUCATION_ACCESS_MODES },
          visibility: { type: String, enum: EDUCATION_CONTENT_VISIBILITIES },
          hero: {
            subtitle: { type: String },
            image: {
              src: { type: String },
              alt: { type: String },
              focalPoint: { x: { type: Number }, y: { type: Number } },
            },
          },
          publicPreview: {
            title: { type: String },
            description: { type: String },
            coverImage: { type: String },
          },
          cover: {
            src: { type: String },
            focalPoint: { x: { type: Number }, y: { type: Number } },
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
    // Samo adrese koje su STVARNO bile javno otkrivene. Slug koji je živeo u
    // radnoj kopiji a nikad objavljen ovde ne ulazi — nije ni imao javni URL.
    publishedSlugHistory: { type: [String], default: [] },
    workingSavedAt: { type: Date, default: null },
    // Zaštita od preticanja: dva paralelna čuvanja iste sesije mogu stići
    // obrnutim redom, a `$set` bi tada upisao stariji tekst preko novijeg.
    workingSessionId: { type: String, default: null },
    workingRevision: { type: Number, default: null },
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
  "publishedSnapshot.accessMode": 1,
  "publishedSnapshot.publishedAt": -1,
});
// Razrešavanje stare javne adrese (301). Nije unique: jedinstvenost alias-a
// proverava objava, jer bi unique nad nizom srušio i dva zapisa sa praznom
// istorijom.
EducationContentSchema.index({ tenantId: 1, publishedSlugHistory: 1 });
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
