// src/app/api/newsletter/campaigns/[id]/landing/route.ts
// DELETE ruta za brisanje landing page-a
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

export async function DELETE(
  request: Request,
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
    const { id } = await context.params;

    const campaign = await NewsletterCampaign.findOneAndDelete({
      _id: id,
      tenantId,
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Reset landing page
    campaign.landingPage = {
      layout: [],
      enabled: false,
      slug: campaign.ctaSlug || "/termini",
      status: "pending",
      generatedAt: undefined,
      regeneratedCount: 0,
      score: 0,
      seo: {},
    };

    await campaign.save();

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Delete landing error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete landing",
      },
      { status: 500 },
    );
  }
}
