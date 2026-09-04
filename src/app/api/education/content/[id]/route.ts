/**
 * GET    /api/education/content/[id] — jedan tenant-scoped zapis
 * PATCH  /api/education/content/[id] — Save Draft
 * DELETE /api/education/content/[id] — brisanje sa admin authority-jem
 *
 * Nijedna operacija ne koristi samo `_id`; filter je uvek `{ _id, tenantId }`.
 */
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { contentValidationFailureResponse } from "@/lib/content/validation/contentValidationResponse";
import {
  educationContentUpdateSchema,
  educationSaveOrderSchema,
  normalizeEducationSlug,
  saveOrderGuard,
} from "@/lib/education/content-document";
import {
  invalidIdResponse,
  isDuplicateSlugError,
  isValidObjectId,
  metadataFailureResponse,
  notFoundResponse,
  requireEducationContentAuthority,
  slugTakenResponse,
} from "@/lib/education/content-authority";
import { EducationContent } from "@/models/EducationContent";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) return invalidIdResponse();

    await connectToDB();

    // Editor uređuje radnu kopiju; objavljeni blokovi bi bili duplikat od par
    // stotina kilobajta bez ijednog čitaoca.
    const item = await EducationContent.findOne({
      _id: id,
      tenantId: authority.tenantId,
    })
      .select("-publishedSnapshot.blocks")
      .lean();

    if (!item) return notFoundResponse();
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[GET /api/education/content/[id]]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) return invalidIdResponse();

    const body = (await request.json()) as Record<string, unknown>;
    const metadata = educationContentUpdateSchema.safeParse(body);
    if (!metadata.success) {
      return metadataFailureResponse(
        metadata.error.issues[0]?.message ?? "Podaci o sadržaju nisu ispravni",
      );
    }

    const updates: Record<string, unknown> = {};

    if (body.blocks !== undefined) {
      const validation = validateContentDocument(body.blocks, "draft");
      if (!validation.valid) return contentValidationFailureResponse(validation);
      updates.blocks = body.blocks;
    }

    if (metadata.data.title !== undefined) updates.title = metadata.data.title;
    if (metadata.data.kind !== undefined) updates.kind = metadata.data.kind;
    if (metadata.data.accessMode !== undefined) {
      updates.accessMode = metadata.data.accessMode;
    }
    if (metadata.data.hero !== undefined) updates.hero = metadata.data.hero;
    if (metadata.data.publicPreview !== undefined) {
      updates.publicPreview = metadata.data.publicPreview;
    }
    if (metadata.data.seo !== undefined) updates.seo = metadata.data.seo;

    // Slug se menja SAMO kad je eksplicitno poslat. Promena naslova ne sme da
    // prepiše ručno potvrđenu web adresu.
    if (metadata.data.slug !== undefined) {
      const slug = normalizeEducationSlug(metadata.data.slug);
      if (!slug) {
        return metadataFailureResponse("Web adresa nije ispravna");
      }
      updates.slug = slug;
    }

    if (Object.keys(updates).length === 0) {
      return metadataFailureResponse("Nema izmena za čuvanje");
    }

    // Save piše SAMO radnu kopiju. `status` i `publishedSnapshot` menja
    // isključivo objava; bez ovoga bi snimanje objavljenog zapisa odmah
    // promenilo ono što javna strana prikazuje.
    updates.workingSavedAt = new Date();

    // Redosled čuvanja: autosave i čuvanje pri izlasku mogu biti u letu
    // istovremeno, a `$set` sam po sebi nema pojma koji je noviji.
    const order = educationSaveOrderSchema.safeParse(body.saveOrder);
    if (order.success) {
      updates.workingSessionId = order.data.sessionId;
      updates.workingRevision = order.data.revision;
    }

    await connectToDB();

    // Save Draft ne menja ni `status` ni `publishedSnapshot`: objavljena
    // verzija ostaje netaknuta dok vlasnica sama ne pokrene Objavi. Newsletter
    // ovde snima preko objavljenog sadržaja; Education namerno ne.
    const item = await EducationContent.findOneAndUpdate(
      {
        _id: id,
        tenantId: authority.tenantId,
        ...saveOrderGuard(order.success ? order.data : null),
      },
      { $set: updates },
      { new: true, runValidators: true },
    )
      .select("-publishedSnapshot.blocks")
      .lean();

    if (!item) {
      // Ili zapis ne postoji, ili je ovo čuvanje preteklo novije iz iste
      // sesije. Drugo nije greška: noviji tekst je već upisan i ovaj zahtev
      // sme samo da se odbaci.
      const current = await EducationContent.findOne({
        _id: id,
        tenantId: authority.tenantId,
      })
        .select("-publishedSnapshot.blocks")
        .lean();

      if (!current) return notFoundResponse();
      return NextResponse.json({ item: current, stale: true });
    }

    return NextResponse.json({ item });
  } catch (error) {
    if (isDuplicateSlugError(error)) return slugTakenResponse();
    console.error("[PATCH /api/education/content/[id]]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) return invalidIdResponse();

    await connectToDB();

    // Media ostaje na provideru: brisanje zapisa ne sme slepo da uništi asset
    // koji drugi sadržaj možda još koristi.
    const deleted = await EducationContent.findOneAndDelete({
      _id: id,
      tenantId: authority.tenantId,
    }).lean();

    if (!deleted) return notFoundResponse();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/education/content/[id]]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
