// src/app/api/newsletter/campaigns/[id]/landing/route.ts
// DELETE ruta za brisanje landing page-a
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import {
  newsletterScopeFilter,
  resolveNewsletterAdminScope,
} from "@/lib/newsletter/adminTenantScope";

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
    const newsletterScope = await resolveNewsletterAdminScope(request, decoded);
    if (!newsletterScope) {
      return NextResponse.json(
        { error: "Newsletter scope nije validan" },
        { status: 403 },
      );
    }

    if (newsletterScope.scope === "tenant") {
      const denied = await requireFeature(
        newsletterScope.tenantId,
        "newsletterLanding",
      );
      if (denied) return denied;
    }
    const { id } = await context.params;

    const campaign = await NewsletterCampaign.findOne({
      _id: id,
      ...newsletterScopeFilter(newsletterScope),
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
