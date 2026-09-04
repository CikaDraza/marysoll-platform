/**
 * GET /api/education/content/[id]/assignments — ko trenutno ima pristup
 * PUT /api/education/content/[id]/assignments — ceo spisak, deklarativno
 *
 * PUT prima konačno stanje umesto pojedinačnih akcija, jer UI je lista sa
 * čekboksovima: ono što nije u spisku gubi pristup, ono što jeste ga dobija.
 */
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { ClientContentAssignment } from "@/models/ClientContentAssignment";
import { EducationContent } from "@/models/EducationContent";
import {
  invalidIdResponse,
  isValidObjectId,
  notFoundResponse,
  requireEducationContentAuthority,
} from "@/lib/education/content-authority";

async function contentExists(id: string, tenantId: string) {
  return EducationContent.exists({ _id: id, tenantId });
}

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
    if (!(await contentExists(id, authority.tenantId))) return notFoundResponse();

    const assignments = (await ClientContentAssignment.find({
      tenantId: authority.tenantId,
      educationContentId: id,
      status: "active",
    })
      .select("clientProfileId assignedAt")
      .lean()) as unknown as { clientProfileId: unknown; assignedAt: Date }[];

    return NextResponse.json({
      clientProfileIds: assignments.map((assignment) =>
        String(assignment.clientProfileId),
      ),
    });
  } catch (error) {
    console.error("[GET /api/education/content/[id]/assignments]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authority = await requireEducationContentAuthority(request);
    if (!authority.ok) return authority.response;

    const { id } = await context.params;
    if (!isValidObjectId(id)) return invalidIdResponse();

    const body = (await request.json()) as { clientProfileIds?: unknown };
    const requested = Array.isArray(body.clientProfileIds)
      ? [...new Set(body.clientProfileIds.map(String))].filter((value) =>
          Types.ObjectId.isValid(value),
        )
      : [];

    await connectToDB();
    if (!(await contentExists(id, authority.tenantId))) return notFoundResponse();

    // Povlačenje je promena statusa, ne brisanje: „ko je imao pristup i do
    // kada" ostaje poslovni podatak.
    await ClientContentAssignment.updateMany(
      {
        tenantId: authority.tenantId,
        educationContentId: id,
        clientProfileId: { $nin: requested },
        status: "active",
      },
      { $set: { status: "revoked", revokedAt: new Date() } },
    );

    for (const clientProfileId of requested) {
      await ClientContentAssignment.updateOne(
        {
          tenantId: authority.tenantId,
          educationContentId: id,
          clientProfileId,
        },
        {
          $set: { status: "active", revokedAt: null },
          $setOnInsert: { assignedAt: new Date() },
        },
        { upsert: true },
      );
    }

    return NextResponse.json({ clientProfileIds: requested });
  } catch (error) {
    console.error("[PUT /api/education/content/[id]/assignments]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
