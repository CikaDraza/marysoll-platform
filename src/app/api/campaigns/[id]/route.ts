// GET /api/campaigns/[id]    — fetch single campaign
// PATCH /api/campaigns/[id]  — update editable fields
// DELETE /api/campaigns/[id] — delete campaign (draft/failed only)
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    const { id } = await ctx.params;

    await connectToDB();

    const campaign = await EmailCampaign.findOne({ _id: id, tenantId }).lean();
    if (!campaign) {
      return NextResponse.json({ error: "Kampanja nije pronađena" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: unknown) {
    console.error("[GET /api/campaigns/[id]]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    const { id } = await ctx.params;

    await connectToDB();

    const body = (await req.json()) as Record<string, unknown>;

    // Only allow editing drafts
    const existing = await EmailCampaign.findOne({ _id: id, tenantId });
    if (!existing) {
      return NextResponse.json({ error: "Kampanja nije pronađena" }, { status: 404 });
    }
    if (existing.scheduling.status !== "draft") {
      return NextResponse.json(
        { error: "Samo kampanje u statusu 'draft' se mogu izmeniti" },
        { status: 422 },
      );
    }

    const allowed = ["topic", "audience", "tone", "content", "template", "optimization", "abTest"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const updated = await EmailCampaign.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: update },
      { new: true },
    ).lean();

    return NextResponse.json({ campaign: updated });
  } catch (error: unknown) {
    console.error("[PATCH /api/campaigns/[id]]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    const { id } = await ctx.params;

    await connectToDB();

    const campaign = await EmailCampaign.findOne({ _id: id, tenantId });
    if (!campaign) {
      return NextResponse.json({ error: "Kampanja nije pronađena" }, { status: 404 });
    }

    await campaign.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[DELETE /api/campaigns/[id]]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
