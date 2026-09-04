import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { resolveTenantCapability } from "@/lib/platform/capabilities-server";
import { EducationContent } from "@/models/EducationContent";
import { normalizeEducationSlug } from "@/lib/education/content-document";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type { ContentFocalPoint } from "@/lib/content/schemas/landing-blocks";
import {
  resolveAccessMode,
  type EducationAccessMode,
  type EducationContentKind,
  type EducationContentVisibility,
} from "@/types/education-content";
import {
  resolveEducationPublicFormat,
  type EducationIntentKey,
  type EducationPublicFormat,
  type EducationTopicKey,
} from "@/lib/education/taxonomy";

/**
 * JAVNI IZVOR ISTINE = `publishedSnapshot`.
 *
 * Radna kopija (root polja) se menja pri svakom čuvanju, pa je javna strana ne
 * sme ni dodirnuti — ni `status`, ni `visibility`, ni `blocks`, ni `slug`.
 * Zapis bez objavljene verzije nije javan ni kada mu je `status: "published"`.
 *
 * Javno OTKRIVEN sadržaj: `public` i `gated`. Zatečeni zapisi nemaju
 * `accessMode`, pa se za njih čita staro `visibility` — i to samo kad novog
 * polja nema, nikad kao alternativa.
 */
const DISCOVERABLE_SNAPSHOT_FILTER = {
  $or: [
    { "publishedSnapshot.accessMode": { $in: ["public", "gated"] } },
    {
      "publishedSnapshot.accessMode": { $exists: false },
      "publishedSnapshot.visibility": "public",
    },
  ],
};

export interface PublicEducationCover {
  src: string;
  /** Bez ovoga bi kartica i naslovna slika sekle mimo izabranog kadra. */
  focalPoint?: ContentFocalPoint;
}

export interface PublicEducationSummary {
  slug: string;
  title: string;
  kind: EducationContentKind;
  format: EducationPublicFormat;
  topicKey?: EducationTopicKey;
  intentKey?: EducationIntentKey;
  accessMode: EducationAccessMode;
  publishedAt: string;
  description?: string;
  cover?: PublicEducationCover;
}

/**
 * Telo postoji SAMO za `public`. Za `gated` je `blocks` prazno i nikada se ne
 * popunjava — zaključan tekst ne sme da napusti server neautorizovanom čitaocu,
 * ni u HTML-u, ni u RSC payload-u.
 */
export interface PublicEducationArticle extends PublicEducationSummary {
  blocks: ContentBlock[];
  seo?: { title?: string; description?: string; ogImage?: string };
}

interface SnapshotRecord {
  publishedSnapshot: {
    title: string;
    slug: string;
    kind: EducationContentKind;
    topicKey?: EducationTopicKey;
    intentKey?: EducationIntentKey;
    accessMode?: EducationAccessMode;
    visibility?: EducationContentVisibility;
    hero?: { subtitle?: string };
    publicPreview?: {
      title?: string;
      description?: string;
      coverImage?: string;
    };
    cover?: PublicEducationCover;
    blocks?: ContentBlock[];
    seo?: { title?: string; description?: string; ogImage?: string };
    publishedAt: Date;
  };
}

/** Javna edukacija postoji samo dok tenant ima razrešen `education.catalog`. */
export async function hasPublicEducationSurface(
  tenantId: string | null | undefined,
): Promise<boolean> {
  const capability = await resolveTenantCapability(tenantId, "education.catalog");
  return Boolean(capability?.enabled);
}

function toSummary(record: SnapshotRecord): PublicEducationSummary {
  const snapshot = record.publishedSnapshot;
  const accessMode = resolveAccessMode(snapshot);
  const preview = snapshot.publicPreview;

  return {
    slug: snapshot.slug,
    // Zaključan sadržaj se javno predstavlja SVOJIM pregledom; ako ga nema,
    // pada na naslov, nikad na telo.
    title:
      accessMode === "gated" ? (preview?.title || snapshot.title) : snapshot.title,
    kind: snapshot.kind,
    format: resolveEducationPublicFormat(snapshot.kind),
    ...(snapshot.topicKey ? { topicKey: snapshot.topicKey } : {}),
    ...(snapshot.intentKey ? { intentKey: snapshot.intentKey } : {}),
    accessMode,
    publishedAt: new Date(snapshot.publishedAt).toISOString(),
    // Naslovna sekcija je izvor istine — osim za zaključan sadržaj, gde
    // eksplicitno unet javni pregled ima prednost: on i postoji zato da bi
    // vlasnica tačno odredila šta javnost vidi.
    description:
      (accessMode === "gated" ? preview?.description : undefined) ||
      snapshot.hero?.subtitle ||
      (accessMode === "gated"
        ? preview?.description
        : snapshot.seo?.description) ||
      undefined,
    // Naslovna slika je izračunata pri objavi i nosi fokus kadra; zatečeni
    // zapisi bez nje padaju na URL iz pregleda/SEO-a, samo bez fokusa.
    cover:
      snapshot.cover?.src
        ? snapshot.cover
        : (accessMode === "gated" ? preview?.coverImage : snapshot.seo?.ogImage)
          ? {
              src: (accessMode === "gated"
                ? preview?.coverImage
                : snapshot.seo?.ogImage) as string,
            }
          : undefined,
  };
}

export async function listPublicEducationContent(
  tenantId: string | null | undefined,
): Promise<PublicEducationSummary[]> {
  if (!(await hasPublicEducationSurface(tenantId))) return [];

  await connectToDB();
  const records = (await EducationContent.find({
    tenantId,
    ...DISCOVERABLE_SNAPSHOT_FILTER,
  })
    .select(
      "publishedSnapshot.title publishedSnapshot.slug publishedSnapshot.kind " +
        "publishedSnapshot.topicKey publishedSnapshot.intentKey " +
        "publishedSnapshot.accessMode publishedSnapshot.visibility " +
        "publishedSnapshot.hero publishedSnapshot.publicPreview " +
        "publishedSnapshot.cover publishedSnapshot.seo " +
        "publishedSnapshot.publishedAt",
    )
    .sort({ "publishedSnapshot.publishedAt": -1 })
    .lean()) as unknown as SnapshotRecord[];

  return records.map(toSummary);
}

export type PublicEducationRoute =
  | { kind: "article"; article: PublicEducationArticle }
  /** Stara javna adresa — pozivalac šalje trajno preusmerenje na kanonsku. */
  | { kind: "redirect"; slug: string }
  | { kind: "not-found" };

/**
 * Razrešavanje javne adrese, tačnim redosledom:
 *
 *   1. kanonska adresa objavljene verzije  → sadržaj
 *   2. ranija JAVNA adresa istog zapisa    → trajno preusmerenje na kanonsku
 *   3. sve ostalo                          → 404
 *
 * Istorija adresa nikada nije orakl: alias se razrešava samo dok je tekuća
 * objavljena verzija javna. Čim zapis pređe u privatan ili bude obrisan, i
 * kanonska i stara adresa vraćaju 404, bez ijednog signala da je nešto
 * postojalo.
 */
export async function resolvePublicEducationRoute(
  tenantId: string | null | undefined,
  slug: string,
): Promise<PublicEducationRoute> {
  const article = await getPublicEducationContent(tenantId, slug);
  if (article) return { kind: "article", article };

  const normalized = normalizeEducationSlug(slug);
  if (!normalized) return { kind: "not-found" };
  if (!(await hasPublicEducationSurface(tenantId))) return { kind: "not-found" };

  await connectToDB();
  const alias = (await EducationContent.findOne({
    tenantId,
    publishedSlugHistory: normalized,
    ...DISCOVERABLE_SNAPSHOT_FILTER,
  })
    .select("publishedSnapshot.slug")
    .lean()) as unknown as SnapshotRecord | null;

  return alias?.publishedSnapshot?.slug
    ? { kind: "redirect", slug: alias.publishedSnapshot.slug }
    : { kind: "not-found" };
}

export async function getPublicEducationContent(
  tenantId: string | null | undefined,
  slug: string,
): Promise<PublicEducationArticle | null> {
  const normalized = normalizeEducationSlug(slug);
  if (!normalized) return null;
  if (!(await hasPublicEducationSurface(tenantId))) return null;

  await connectToDB();
  const record = (await EducationContent.findOne({
    tenantId,
    "publishedSnapshot.slug": normalized,
    ...DISCOVERABLE_SNAPSHOT_FILTER,
  })
    .select("publishedSnapshot")
    .lean()) as unknown as SnapshotRecord | null;

  if (!record) return null;

  const summary = toSummary(record);
  return {
    ...summary,
    // Zaključan sadržaj nikada ne nosi telo niti SEO iz zaključanog dela.
    blocks:
      summary.accessMode === "public"
        ? (record.publishedSnapshot.blocks ?? [])
        : [],
    seo:
      summary.accessMode === "public"
        ? record.publishedSnapshot.seo
        : {
            title: summary.title,
            description: summary.description,
            ogImage: summary.cover?.src,
          },
  };
}
