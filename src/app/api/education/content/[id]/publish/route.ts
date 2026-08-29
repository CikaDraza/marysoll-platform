/**
 * POST /api/education/content/[id]/publish — strict publish.
 *
 * Objava je JEDINA granica koja radnu kopiju promoviše u javnu verziju:
 *
 *   root polja        → radna kopija (Save je menja)
 *   publishedSnapshot → javna verzija (menja je samo ova ruta)
 *
 * Blokovi se ne primaju iz tela zahteva, pa ne postoji put kojim bi se
 * objavilo nešto što nije prošlo Save Draft.
 */
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { contentValidationFailureResponse } from "@/lib/content/validation/contentValidationResponse";
import {
  buildPublishedSnapshot,
  educationPublishHostFailure,
  hasPublishableBlock,
} from "@/lib/education/content-document";
import {
  invalidIdResponse,
  isDuplicateSlugError,
  isValidObjectId,
  notFoundResponse,
  publicSlugTakenResponse,
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

    const working = await EducationContent.findOne({
      _id: id,
      tenantId: authority.tenantId,
    })
      .select("title slug kind visibility blocks seo")
      .lean();

    if (!working) return notFoundResponse();

    const validation = validateContentDocument(
      (working as { blocks?: unknown }).blocks,
      "publish",
    );
    if (!validation.valid) return contentValidationFailureResponse(validation);
    if (!hasPublishableBlock(validation)) {
      return contentValidationFailureResponse(
        educationPublishHostFailure(validation),
      );
    }

    const snapshot = buildPublishedSnapshot(
      working as unknown as Parameters<typeof buildPublishedSnapshot>[0],
      new Date(),
    );

    // Dva objavljena zapisa istog tenanta ne smeju izložiti isti javni URL.
    // Radni slug se sme menjati odmah po snimanju, pa root indeks ovo ne
    // pokriva — partial unique indeks nad snapshot slug-om je stvarna garancija,
    // a ova provera samo daje razumljivu poruku umesto sirovog 11000.
    const liveCollision = await EducationContent.findOne({
      tenantId: authority.tenantId,
      _id: { $ne: id },
      "publishedSnapshot.slug": snapshot.slug,
    })
      .select("_id")
      .lean();

    if (liveCollision) return publicSlugTakenResponse();

    const item = await EducationContent.findOneAndUpdate(
      { _id: id, tenantId: authority.tenantId },
      { $set: { status: "published", publishedSnapshot: snapshot } },
      { new: true },
    )
      .select("-publishedSnapshot.blocks")
      .lean();

    if (!item) return notFoundResponse();
    return NextResponse.json({ item });
  } catch (error) {
    if (isDuplicateSlugError(error)) return publicSlugTakenResponse();
    console.error("[POST /api/education/content/[id]/publish]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
