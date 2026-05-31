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

    const campaign = await NewsletterCampaign.findOneAndUpdate(
      { _id: campaignId, ...newsletterScopeFilter(newsletterScope) },
      {
        ...(payload.campaignType && { campaignType: payload.campaignType }),
        ...(landingSlug && {
          ctaSlug: landingSlug,
        }),
        ...(payload.semanticContent && {
          semanticContent: {
            ...payload.semanticContent,
            status: payload.semanticContent.status ?? "draft",
          },
        }),
        ...(payload.landingPage && {
          landingPage: {
            ...payload.landingPage,
            slug: landingSlug,
            audience: landingAudience,
            editorialCategory: landingEditorialCategory,
          },
        }),
      },
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
