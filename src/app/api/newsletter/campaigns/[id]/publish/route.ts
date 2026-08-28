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
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { contentValidationFailureResponse } from "@/lib/newsletter/contentValidationResponse";

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
    const body = (await request.json()) as PublishLandingPayload | null;

    const campaign = await NewsletterCampaign.findOne({
      _id: id,
      ...newsletterScopeFilter(newsletterScope),
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (campaign.campaignType !== "email-landing") {
      return NextResponse.json(
        { error: "Campaign is not landing-enabled" },
        { status: 400 },
      );
    }

    const validation = validateContentDocument(body?.layout, "publish");
    if (!validation.valid) {
      return contentValidationFailureResponse(validation);
    }
    if (!validation.blocks.some(({ status }) => status === "VALID")) {
      return contentValidationFailureResponse({
        ...validation,
        valid: false,
        issues: [
          {
            blockId: "document",
            blockType: "document",
            path: "",
            code: "required_content",
            message:
              "Newsletter landing mora imati najmanje jedan vidljiv i kompletan blok",
            severity: "error",
          },
        ],
      });
    }

    // Update landing page with published status
    const audience = normalizeEditorialAudience(
      body?.audience ??
        campaign.landingPage?.audience ??
        (newsletterScope.scope === "platform" ? "partner" : "client"),
      decoded.isSuperAdmin ?? false,
    );
    const editorialCategory = normalizeEditorialCategory(
      body?.editorialCategory ?? campaign.landingPage?.editorialCategory,
      audience,
    );

    campaign.set("landingPage.enabled", true);
    campaign.set("landingPage.slug", campaign.ctaSlug);
    campaign.set("landingPage.layout", body!.layout);
    campaign.set("landingPage.semanticType", body?.semanticType);
    campaign.set("landingPage.audience", audience);
    campaign.set("landingPage.editorialCategory", editorialCategory);
    campaign.set("landingPage.generatedAt", body?.generatedAt);
    campaign.set(
      "landingPage.score",
      body?.score || campaign.landingPage?.score || 0,
    );
    campaign.set(
      "landingPage.seo",
      body?.seo || campaign.landingPage?.seo || {},
    );
    campaign.set("landingPage.status", "published");

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
