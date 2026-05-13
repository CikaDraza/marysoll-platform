// src/app/api/newsletter/campaigns/[id]/save/route.ts
// Čuva kampanju sa statusom "generated" (bez publish-ovanja)
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { SaveCampaignSemanticPayload } from "@/types/newsletter";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

function normalizeNewsletterLandingSlug(slug?: string) {
  return (
    slug
      ?.trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/+/, "")
      .replace(/^blog\/+/i, "")
      .replace(/\s+/g, "-")
      .toLowerCase() || ""
  );
}

export async function PATCH(
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

    const denied = await requireFeature(tenantId, "newsletterLanding");
    if (denied) return denied;
    const { id } = await context.params;
    const payload: SaveCampaignSemanticPayload = await request.json();

    const campaign = await NewsletterCampaign.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { ...payload } },
      { new: true },
    );

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update campaign
    campaign.campaignType = payload.campaignType;
    campaign.semanticContent = {
      ...campaign.semanticContent,
      ...payload.semanticContent,
    };

    if (payload.campaignType === "email-landing" && payload.landingPage) {
      const slug = normalizeNewsletterLandingSlug(payload.landingPage.slug);

      campaign.landingPage = {
        enabled: true,
        slug,
        layout: payload.landingPage.layout || [],
        seo: payload.landingPage.seo || {},
        score: payload.landingPage.score || 0,
        semanticType: payload.landingPage.semanticType,
        generatedAt: payload.landingPage.generatedAt || new Date(),
        status: "generated", // Uvek "generated" za save
        regeneratedCount: (campaign.landingPage?.regeneratedCount || 0) + 1,
      };
      campaign.ctaSlug = slug;
    }

    await campaign.save();

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Save campaign error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri čuvanju kampanje",
      },
      { status: 500 },
    );
  }
}
