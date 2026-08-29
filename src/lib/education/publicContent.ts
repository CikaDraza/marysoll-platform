import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { resolveTenantCapability } from "@/lib/platform/capabilities-server";
import { EducationContent } from "@/models/EducationContent";
import { normalizeEducationSlug } from "@/lib/education/content-document";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type {
  EducationContentKind,
  EducationContentVisibility,
} from "@/types/education-content";

/**
 * JAVNI IZVOR ISTINE = `publishedSnapshot`.
 *
 * Radna kopija (root polja) se menja pri svakom čuvanju, pa je javna strana ne
 * sme ni dodirnuti — ni `status`, ni `visibility`, ni `blocks`, ni `slug`.
 * Zapis bez objavljene verzije nije javan ni kada mu je `status: "published"`.
 *
 * Danas su vidljivosti dve (`public`/`private`); ciljni trostepeni `accessMode`
 * dolazi u 3A.2 i menja SAMO uslov ispod, ne i to odakle se čita.
 */
const PUBLIC_SNAPSHOT_FILTER = {
  "publishedSnapshot.visibility": "public" as const,
};

export interface PublicEducationSummary {
  slug: string;
  title: string;
  kind: EducationContentKind;
  publishedAt: string;
  description?: string;
  coverImage?: string;
}

export interface PublicEducationArticle extends PublicEducationSummary {
  blocks: ContentBlock[];
  seo?: { title?: string; description?: string; ogImage?: string };
}

interface SnapshotRecord {
  publishedSnapshot: {
    title: string;
    slug: string;
    kind: EducationContentKind;
    visibility: EducationContentVisibility;
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
  return {
    slug: snapshot.slug,
    title: snapshot.title,
    kind: snapshot.kind,
    publishedAt: new Date(snapshot.publishedAt).toISOString(),
    description: snapshot.seo?.description || undefined,
    coverImage: snapshot.seo?.ogImage || undefined,
  };
}

export async function listPublicEducationContent(
  tenantId: string | null | undefined,
): Promise<PublicEducationSummary[]> {
  if (!(await hasPublicEducationSurface(tenantId))) return [];

  await connectToDB();
  const records = (await EducationContent.find({
    tenantId,
    ...PUBLIC_SNAPSHOT_FILTER,
  })
    .select("publishedSnapshot.title publishedSnapshot.slug publishedSnapshot.kind publishedSnapshot.seo publishedSnapshot.publishedAt")
    .sort({ "publishedSnapshot.publishedAt": -1 })
    .lean()) as unknown as SnapshotRecord[];

  return records.map(toSummary);
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
    ...PUBLIC_SNAPSHOT_FILTER,
  })
    .select("publishedSnapshot")
    .lean()) as unknown as SnapshotRecord | null;

  if (!record) return null;

  return {
    ...toSummary(record),
    blocks: record.publishedSnapshot.blocks ?? [],
    seo: record.publishedSnapshot.seo,
  };
}
