import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";

// Brisanje kampanje
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();
    const authResult: AdminAuthResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }
    const { decoded } = authResult;
    const tenantId = decoded.tenantId;

    const denied = await requireFeature(tenantId, "newsletterCampaigns");
    if (denied) return denied;
    const { id } = await context.params;
    const campaign = await NewsletterCampaign.findOneAndDelete({
      _id: id,
      tenantId,
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Kampanja nije pronađena" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Kampanja uspešno obrisana",
      success: true,
    });
  } catch (error) {
    console.error("Campaign delete error:", error);
    return NextResponse.json(
      { error: "Greška prilikom brisanja kampanje" },
      { status: 500 },
    );
  }
}
