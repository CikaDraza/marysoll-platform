/**
 * POST /api/education/content/[id]/publish — strict publish.
 *
 * Publish čita PERSISTED zapis; blokovi se ne primaju iz tela zahteva, pa ne
 * postoji put kojim bi se objavilo nešto što nije prošlo Save Draft.
 */
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { contentValidationFailureResponse } from "@/lib/content/validation/contentValidationResponse";
import {
  educationPublishHostFailure,
  hasPublishableBlock,
} from "@/lib/education/content-document";
import {
  invalidIdResponse,
  isValidObjectId,
  notFoundResponse,
  requireEducationContentAuthority,
} from "@/lib/education/content-authority";
import { EducationContent } from "@/models/EducationContent";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) return invalidIdResponse();

    await connectToDB();

    const current = await EducationContent.findOne({
      _id: id,
      tenantId: authority.tenantId,
    })
      .select("blocks")
      .lean();

    if (!current) return notFoundResponse();

    const validation = validateContentDocument(
      (current as { blocks?: unknown }).blocks,
      "publish",
    );
    if (!validation.valid) return contentValidationFailureResponse(validation);
    if (!hasPublishableBlock(validation)) {
      return contentValidationFailureResponse(
        educationPublishHostFailure(validation),
      );
    }

    const item = await EducationContent.findOneAndUpdate(
      { _id: id, tenantId: authority.tenantId },
      { $set: { status: "published", publishedAt: new Date() } },
      { new: true },
    ).lean();

    if (!item) return notFoundResponse();
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[POST /api/education/content/[id]/publish]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
