/**
 * GET    /api/audience-segments/[id]  – get single segment
 * PATCH  /api/audience-segments/[id]  – update segment
 * DELETE /api/audience-segments/[id]  – delete segment
 */
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { AudienceSegment } from "@/models/AudienceSegment";
import { Types } from "mongoose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectToDB();

    const segment = await AudienceSegment.findOne({
      _id: id,
      tenantId: authResult.decoded.tenantId,
    }).lean();

    if (!segment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ segment });
  } catch (err) {
    console.error("[GET /api/audience-segments/[id]]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = (await req.json()) as {
      name?: string;
      filters?: {
        lastVisitDays?: number;
        tags?: string[];
        subscribed?: boolean;
        roles?: string[];
      };
    };

    await connectToDB();

    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name.trim();
    if (body.filters !== undefined) updates.filters = body.filters;

    const segment = await AudienceSegment.findOneAndUpdate(
      { _id: id, tenantId: authResult.decoded.tenantId },
      { $set: updates },
      { new: true },
    ).lean();

    if (!segment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ segment });
  } catch (err) {
    console.error("[PATCH /api/audience-segments/[id]]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectToDB();

    await AudienceSegment.findOneAndDelete({
      _id: id,
      tenantId: authResult.decoded.tenantId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/audience-segments/[id]]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
