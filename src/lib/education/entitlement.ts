import "server-only";

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { ClientContentAssignment } from "@/models/ClientContentAssignment";
import { EducationContent } from "@/models/EducationContent";
import { resolveTenantCapability } from "@/lib/platform/capabilities-server";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import { resolveAccessMode } from "@/types/education-content";
import type {
  EducationAccessMode,
  EducationContentKind,
} from "@/types/education-content";

/**
 * ZAŠTIĆENO ČITANJE — jedina putanja kojom telo zaključanog ili privatnog
 * sadržaja sme da napusti server.
 *
 * Javna ruta `/edukacija/{slug}` nikada ne dobija zaštićeno telo, ni kada je
 * čitalac prijavljen i ima pristup. Time javna strana ostaje bezlična i
 * keširana, a personalizacija živi samo ovde. Ceo razred grešaka — slučajno
 * keširan autorizovan odgovor, CDN, ISR, canonical, sitemap — time nestaje.
 *
 * Uslov je uvek sva četiri, nikada „ulogovan je pa sme":
 *
 *   isti tenant · isti clientProfileId · dodela postoji · dodela je aktivna
 */
export interface AssignedEducationSummary {
  id: string;
  title: string;
  kind: EducationContentKind;
  accessMode: EducationAccessMode;
  publishedAt: string;
  description?: string;
  cover?: { src: string; focalPoint?: { x: number; y: number } };
}

export interface AssignedEducationArticle extends AssignedEducationSummary {
  blocks: ContentBlock[];
}

interface SnapshotShape {
  _id: unknown;
  publishedSnapshot?: {
    title: string;
    kind: EducationContentKind;
    accessMode?: unknown;
    visibility?: unknown;
    publicPreview?: { description?: string };
    cover?: { src: string; focalPoint?: { x: number; y: number } };
    seo?: { description?: string };
    blocks?: ContentBlock[];
    publishedAt: Date;
  } | null;
}

function toSummary(record: SnapshotShape): AssignedEducationSummary | null {
  const snapshot = record.publishedSnapshot;
  // Bez objavljene verzije nema šta da se pokaže: klijentkinja čita objavljeno
  // stanje, nikada radnu kopiju vlasnice.
  if (!snapshot) return null;

  return {
    id: String(record._id),
    title: snapshot.title,
    kind: snapshot.kind,
    accessMode: resolveAccessMode(snapshot),
    publishedAt: new Date(snapshot.publishedAt).toISOString(),
    description:
      snapshot.publicPreview?.description || snapshot.seo?.description || undefined,
    cover: snapshot.cover,
  };
}

async function educationEnabled(tenantId: string): Promise<boolean> {
  const capability = await resolveTenantCapability(tenantId, "education.catalog");
  return Boolean(capability?.enabled);
}

/** Sadržaji dodeljeni ovoj klijentkinji — „Moji sadržaji". */
export async function listAssignedEducationContent(
  tenantId: string,
  clientProfileId: string,
): Promise<AssignedEducationSummary[]> {
  if (!Types.ObjectId.isValid(clientProfileId)) return [];
  if (!(await educationEnabled(tenantId))) return [];

  await connectToDB();
  const assignments = (await ClientContentAssignment.find({
    tenantId,
    clientProfileId,
    status: "active",
  })
    .select("educationContentId")
    .lean()) as unknown as { educationContentId: unknown }[];

  if (assignments.length === 0) return [];

  const records = (await EducationContent.find({
    tenantId,
    _id: {
      $in: assignments.map(
        (assignment) =>
          (assignment as { educationContentId: unknown }).educationContentId,
      ),
    },
  })
    .select(
      "publishedSnapshot.title publishedSnapshot.kind publishedSnapshot.accessMode " +
        "publishedSnapshot.visibility publishedSnapshot.publicPreview " +
        "publishedSnapshot.cover publishedSnapshot.seo publishedSnapshot.publishedAt",
    )
    .sort({ "publishedSnapshot.publishedAt": -1 })
    .lean()) as unknown as SnapshotShape[];

  return records
    .map(toSummary)
    .filter((summary): summary is AssignedEducationSummary => summary !== null);
}

/**
 * Ceo dodeljen sadržaj, sa telom. Vraća `null` za sve što ne prođe — ne
 * postoji, tuđe je, nije dodeljeno ili je pristup povučen izgledaju isto.
 */
export async function readAssignedEducationContent(
  tenantId: string,
  clientProfileId: string,
  educationContentId: string,
): Promise<AssignedEducationArticle | null> {
  if (
    !Types.ObjectId.isValid(clientProfileId) ||
    !Types.ObjectId.isValid(educationContentId)
  ) {
    return null;
  }
  if (!(await educationEnabled(tenantId))) return null;

  await connectToDB();

  // Sva četiri uslova u jednom upitu: tenant, klijent, sadržaj, aktivna dodela.
  const assignment = await ClientContentAssignment.exists({
    tenantId,
    clientProfileId,
    educationContentId,
    status: "active",
  });
  if (!assignment) return null;

  const record = (await EducationContent.findOne({
    _id: educationContentId,
    tenantId,
  })
    .select("publishedSnapshot")
    .lean()) as unknown as SnapshotShape | null;

  const summary = record ? toSummary(record) : null;
  if (!record || !summary) return null;

  return { ...summary, blocks: record.publishedSnapshot?.blocks ?? [] };
}
