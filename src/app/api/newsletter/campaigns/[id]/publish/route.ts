// src/app/api/newsletter/campaigns/[id]/publish/route.ts
// Objavljuje landing sa statusom "published"
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { PublishLandingPayload } from "@/types/newsletter";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import {
  normalizeEditorialAudience,
  normalizeEditorialCategory,
} from "@/lib/newsletter/editorialClassification";
import {
  newsletterScopeFilter,
  resolveNewsletterAdminScope,
} from "@/lib/newsletter/adminTenantScope";

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
    const body: PublishLandingPayload = await request.json();

    const campaign = await NewsletterCampaign.findOneAndUpdate(
      {
        _id: id,
        ...newsletterScopeFilter(newsletterScope),
      },
      {
        $set: {
          "landingPage.status": "published",
        },
      },
      {
        new: true,
      },
    );

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (campaign.campaignType !== "email-landing") {
      return NextResponse.json(
        { error: "Campaign is not landing-enabled" },
        { status: 400 },
      );
    }

    // Update landing page with published status
    const audience = normalizeEditorialAudience(
      body.audience ??
        campaign.landingPage?.audience ??
        (newsletterScope.scope === "platform" ? "partner" : "client"),
      decoded.isSuperAdmin ?? false,
    );
    const editorialCategory = normalizeEditorialCategory(
      body.editorialCategory ?? campaign.landingPage?.editorialCategory,
      audience,
    );

    campaign.landingPage = {
      enabled: true,
      slug: campaign.ctaSlug,
      layout: body.layout,
      semanticType: body.semanticType,
      audience,
      editorialCategory,
      generatedAt: body.generatedAt,
      status: "published", // Uvek "published" za publish
      score: body.score || campaign.landingPage?.score || 0,
      seo: body.seo || campaign.landingPage?.seo || {},
      regeneratedCount: campaign.landingPage?.regeneratedCount || 0,
    };

    await campaign.save();

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Publish landing error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri objavljivanju landing-a",
      },
      { status: 500 },
    );
  }
}
