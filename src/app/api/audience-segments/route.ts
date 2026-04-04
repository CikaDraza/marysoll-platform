/**
 * GET  /api/audience-segments  – list all segments for tenant
 * POST /api/audience-segments  – create a new segment
 */
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { AudienceSegment } from "@/models/AudienceSegment";
import { UserSalon } from "@/models/UserSalon";
import { Types } from "mongoose";

/** Estimate how many clients match a segment's filters */
async function estimateCount(
  tenantId: Types.ObjectId,
  filters: {
    roles?: string[];
    subscribed?: boolean;
    lastVisitDays?: number;
    tags?: string[];
  },
): Promise<number> {
  const roles = filters.roles?.length ? filters.roles : ["CLIENT"];
  const query: Record<string, unknown> = {
    salonId: tenantId,
    role: { $in: roles },
    isActive: true,
  };
  return UserSalon.countDocuments(query);
}

export async function GET(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    await connectToDB();

    const segments = await AudienceSegment.find({ tenantId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ segments });
  } catch (err) {
    console.error("[GET /api/audience-segments]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const rawTenantId = authResult.decoded.tenantId;
    if (!rawTenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = new Types.ObjectId(rawTenantId);
    const body = (await req.json()) as {
      name: string;
      filters?: {
        lastVisitDays?: number;
        tags?: string[];
        subscribed?: boolean;
        roles?: string[];
      };
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    await connectToDB();

    const estimatedCount = await estimateCount(tenantId, body.filters ?? {});

    const segment = await AudienceSegment.create({
      tenantId,
      name: body.name.trim(),
      filters: body.filters ?? {},
      estimatedCount,
    });

    return NextResponse.json({ segment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/audience-segments]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
