// src/app/api/newsletter/campaigns/[id]/save/route.ts
// Čuva kampanju sa statusom "generated" (bez publish-ovanja)
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { SaveCampaignSemanticPayload } from "@/types/newsletter";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import {
  normalizeEditorialAudience,
  normalizeEditorialCategory,
} from "@/lib/newsletter/editorialClassification";
import {
  newsletterScopeFilter,
  resolveNewsletterAdminScope,
} from "@/lib/newsletter/adminTenantScope";
import { slugify } from "@/helpers/slugify";
import { validateContentDocument } from "@/lib/content/validation/contentBlockValidation";
import { contentValidationFailureResponse } from "@/lib/newsletter/contentValidationResponse";

function normalizeNewsletterLandingSlug(slug?: string) {
  if (!slug?.trim()) return "";
  const raw = slug
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/^blog\/+/i, "");
  return slugify(raw);
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
    const payload: SaveCampaignSemanticPayload = await request.json();

    const campaign = await NewsletterCampaign.findOne({
      _id: id,
      ...newsletterScopeFilter(newsletterScope),
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (payload.campaignType === "email-landing" && payload.landingPage) {
      const layout = payload.landingPage.layout ?? [];
      const validation = validateContentDocument(layout, "draft");
      if (!validation.valid) {
        return contentValidationFailureResponse(validation);
      }

      const slug = normalizeNewsletterLandingSlug(payload.landingPage.slug);
      const audience = normalizeEditorialAudience(
        payload.landingPage.audience ??
          (newsletterScope.scope === "platform" ? "partner" : "client"),
        decoded.isSuperAdmin ?? false,
      );
      const editorialCategory = normalizeEditorialCategory(
        payload.landingPage.editorialCategory,
        audience,
      );

      campaign.set("landingPage.enabled", true);
      campaign.set("landingPage.slug", slug);
      campaign.set("landingPage.layout", layout);
      if (payload.landingPage.customCtas !== undefined) {
        campaign.set("landingPage.customCtas", payload.landingPage.customCtas);
      }
      if (payload.landingPage.seo !== undefined) {
        campaign.set("landingPage.seo", payload.landingPage.seo);
      }
      if (payload.landingPage.score !== undefined) {
        campaign.set("landingPage.score", payload.landingPage.score);
      }
      if (payload.landingPage.semanticType !== undefined) {
        campaign.set(
          "landingPage.semanticType",
          payload.landingPage.semanticType,
        );
      }
      campaign.set("landingPage.audience", audience);
      campaign.set("landingPage.editorialCategory", editorialCategory);
      campaign.set(
        "landingPage.generatedAt",
        payload.landingPage.generatedAt || new Date(),
      );
      campaign.set("landingPage.status", "generated");
      campaign.set(
        "landingPage.regeneratedCount",
        (campaign.landingPage?.regeneratedCount || 0) + 1,
      );
      campaign.set("ctaSlug", slug);
    }

    campaign.set("campaignType", payload.campaignType);
    campaign.set("semanticContent", {
      ...campaign.semanticContent,
      ...payload.semanticContent,
    });

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
