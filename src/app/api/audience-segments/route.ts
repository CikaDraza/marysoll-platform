/**
 * GET  /api/audience-segments  – list all segments for tenant
 * POST /api/audience-segments  – create a new segment
 */
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { AudienceSegment } from "@/models/AudienceSegment";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { AudienceContact } from "@/models/AudienceContact";
import { Types } from "mongoose";

/** Estimate how many AudienceContacts match a segment's filters */
async function estimateCount(
  tenantId: Types.ObjectId,
  filters: {
    roles?: string[];
    subscribed?: boolean;
    lastVisitDays?: number;
    tags?: string[];
  },
): Promise<number> {
  const query: Record<string, unknown> = {
    tenantId,
    status: "ACTIVE",
    subscribed: true,
  };

  if (filters.subscribed === false) {
    query.subscribed = false;
  }

  if (filters.tags?.length) {
    query.tags = { $in: filters.tags };
  }

  // roles map: treat "CLIENT" → contactType CLIENT, "SALON_OWNER" → SALON_OWNER, etc.
  if (filters.roles?.length) {
    query.contactType = { $in: filters.roles };
  }

  return AudienceContact.countDocuments(query);
}

export async function GET(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;
    const denied = await requireCapability(
      authResult.decoded.tenantId,
      "audience.contacts",
    );
    if (denied) return denied;

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
    const denied = await requireCapability(
      authResult.decoded.tenantId,
      "audience.contacts",
    );
    if (denied) return denied;

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
