// app/api/newsletter/campaigns/[id]/semantic/route.ts
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NextResponse } from "next/server";
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
        "newsletterCampaigns",
      );
      if (denied) return denied;
    }

    const { id } = await context.params;
    const payload = await request.json();

    // Content body writes belong exclusively to the validated save/publish
    // routes. Keeping this rejection explicit prevents a legacy caller from
    // silently believing that an unvalidated layout was persisted here.
    if (payload.landingPage?.layout !== undefined) {
      return NextResponse.json(
        {
          error: "Landing layout se čuva kroz Content Composer save rutu",
          code: "LANDING_LAYOUT_WRITE_NOT_ALLOWED",
        },
        { status: 400 },
      );
    }

    const landingSlug = normalizeNewsletterLandingSlug(payload.landingPage?.slug);
    const landingAudience = normalizeEditorialAudience(
      payload.landingPage?.audience ??
        (newsletterScope.scope === "platform" ? "partner" : "client"),
      decoded.isSuperAdmin ?? false,
    );
    const landingEditorialCategory = normalizeEditorialCategory(
      payload.landingPage?.editorialCategory,
      landingAudience,
    );

    const campaignId = id;

    const updates: Record<string, unknown> = {};
    if (payload.campaignType) updates.campaignType = payload.campaignType;
    if (landingSlug) {
      updates.ctaSlug = landingSlug;
      updates["landingPage.slug"] = landingSlug;
    }
    if (payload.semanticContent) {
      updates.semanticContent = {
        ...payload.semanticContent,
        status: payload.semanticContent.status ?? "draft",
      };
    }
    if (payload.landingPage) {
      updates["landingPage.audience"] = landingAudience;
      updates["landingPage.editorialCategory"] = landingEditorialCategory;
      if (typeof payload.landingPage.enabled === "boolean") {
        updates["landingPage.enabled"] = payload.landingPage.enabled;
      }
    }

    const campaign = await NewsletterCampaign.findOneAndUpdate(
      { _id: campaignId, ...newsletterScopeFilter(newsletterScope) },
      { $set: updates },
      { new: true },
    );

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri povezivanju sa bazom podataka",
      },
      { status: 500 },
    );
  }
}
