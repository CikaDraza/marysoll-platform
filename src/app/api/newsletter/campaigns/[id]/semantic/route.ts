// app/api/newsletter/campaigns/[id]/semantic/route.ts
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NextResponse } from "next/server";
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

    const denied = await requireFeature(tenantId, "newsletterCampaigns");
    if (denied) return denied;

    const { id } = await context.params;
    const payload = await request.json();
    const landingSlug = normalizeNewsletterLandingSlug(payload.landingPage?.slug);

    const campaignId = id;

    const campaign = await NewsletterCampaign.findOneAndUpdate(
      { _id: campaignId, tenantId },
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
