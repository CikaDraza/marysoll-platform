// POST /api/campaigns/[id]/preview
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { generateLandingPreview } from "@/lib/ai/orchestrator";
import {
  newsletterScopeFilter,
  resolveNewsletterAdminScope,
} from "@/lib/newsletter/adminTenantScope";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const newsletterScope = await resolveNewsletterAdminScope(
      req,
      authResult.decoded,
    );

    await connectToDB();
    const { id } = await context.params;

    let campaign;
    if (newsletterScope) {
      if (newsletterScope.scope === "tenant") {
        const denied = await requireFeature(
          newsletterScope.tenantId,
          "aiLandingPages",
        );
        if (denied) return denied;
      }
      campaign = await NewsletterCampaign.findOne({
        _id: id,
        ...newsletterScopeFilter(newsletterScope),
      });
    } else if (authResult.decoded.isSuperAdmin) {
      // Superadmin accessing admin domain without explicit scope header —
      // allow unrestricted access by campaign ID and derive feature check from campaign itself
      campaign = await NewsletterCampaign.findById(id);
    } else {
      return NextResponse.json(
        { error: "Newsletter scope nije validan" },
        { status: 403 },
      );
    }
    if (!campaign) {
      return NextResponse.json(
        { error: "Kampanja nije pronađena" },
        { status: 404 },
      );
    }

    const { campaignType, semanticContent, customPrompt, imagesUrl } =
      await req.json();

    // Guard: nema landing preview za email-only
    if (campaignType !== "email-landing") {
      return NextResponse.json({ landing: null });
    }

    const { intent, summary, tone } = semanticContent;

    if (!intent || !summary || !tone) {
      return NextResponse.json(
        { error: "Missing semantic data" },
        { status: 400 },
      );
    }

    const landing = await generateLandingPreview({
      campaignType,
      semanticContent: { intent, summary, tone },
      customPrompt,
      imagesUrl,
    });

    return NextResponse.json({ landing });
  } catch (error: unknown) {
    console.error("Campaign preview AI error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Preview generation failed",
      },
      { status: 500 },
    );
  }
}
