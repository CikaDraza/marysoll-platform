// POST /api/campaigns/[id]/regenerate-template
// Regenerates the HTML template using the current (edited) content fields.
// The AI is instructed to use the exact provided values and preserve layout.
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { regenerateCampaignTemplate } from "@/lib/ai/agents/emailCampaign/campaignTemplateAgent";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    const { id } = await ctx.params;

    await connectToDB();

    const campaign = await EmailCampaign.findOne({ _id: id, tenantId });
    if (!campaign) {
      return NextResponse.json({ error: "Kampanja nije pronađena" }, { status: 404 });
    }

    if (campaign.scheduling.status !== "draft") {
      return NextResponse.json(
        { error: "HTML se može regenerisati samo za draft kampanje" },
        { status: 422 },
      );
    }

    const existingHtml = campaign.template?.html ?? "";

    const newHtml = await regenerateCampaignTemplate(existingHtml, {
      subject: campaign.content?.subject ?? "",
      previewText: campaign.content?.previewText ?? "",
      heroTitle: campaign.content?.heroTitle ?? "",
      heroText: campaign.content?.heroText ?? "",
      ctaText: campaign.content?.ctaText ?? "",
      ctaUrl: campaign.content?.ctaUrl ?? "",
    });

    // Return preview without saving — client decides whether to apply
    return NextResponse.json({ html: newHtml });
  } catch (error: unknown) {
    console.error("[POST /api/campaigns/[id]/regenerate-template]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
