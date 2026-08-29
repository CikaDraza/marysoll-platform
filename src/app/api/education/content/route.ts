/**
 * GET  /api/education/content — tenant-scoped lista
 * POST /api/education/content — kreira draft pri prvom Save-u
 *
 * Prazan zapis se NE kreira samo zato što je vlasnica otvorila „Novi sadržaj”.
 */
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { contentValidationFailureResponse } from "@/lib/content/validation/contentValidationResponse";
import {
  educationContentCreateSchema,
  resolveEducationSlug,
} from "@/lib/education/content-document";
import {
  isDuplicateSlugError,
  metadataFailureResponse,
  requireEducationContentAuthority,
  slugTakenResponse,
} from "@/lib/education/content-authority";
import { EducationContent } from "@/models/EducationContent";

export async function GET(request: Request) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    await connectToDB();

    const items = await EducationContent.find({ tenantId: authority.tenantId })
      .select("title slug kind visibility status updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/education/content]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    const body = (await request.json()) as Record<string, unknown>;
    const metadata = educationContentCreateSchema.safeParse(body);
    if (!metadata.success) {
      return metadataFailureResponse(
        metadata.error.issues[0]?.message ?? "Podaci o sadržaju nisu ispravni",
      );
    }

    const blocks = Array.isArray(body.blocks) ? body.blocks : [];
    const validation = validateContentDocument(blocks, "draft");
    if (!validation.valid) return contentValidationFailureResponse(validation);

    const slug = resolveEducationSlug({
      requestedSlug: metadata.data.slug,
      title: metadata.data.title,
    });
    if (!slug) {
      return metadataFailureResponse(
        "Web adresa se ne može izvesti iz naslova. Unesite je ručno.",
      );
    }

    await connectToDB();

    const created = await EducationContent.create({
      tenantId: authority.tenantId,
      title: metadata.data.title,
      slug,
      kind: metadata.data.kind,
      visibility: metadata.data.visibility,
      status: "draft",
      // Persist tačno one blokove koje je validator prihvatio, bez tihog
      // odsecanja polja.
      blocks,
      seo: metadata.data.seo ?? {},
    });

    return NextResponse.json({ item: created.toObject() }, { status: 201 });
  } catch (error) {
    if (isDuplicateSlugError(error)) return slugTakenResponse();
    console.error("[POST /api/education/content]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
