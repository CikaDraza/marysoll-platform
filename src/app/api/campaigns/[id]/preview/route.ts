// POST /api/campaigns/[id]/preview
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { generateLandingPreview } from "@/lib/ai/orchestrator";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "aiLandingPages");
    if (denied) return denied;

    await connectToDB();
    const { id } = await context.params;
    const campaign = await NewsletterCampaign.findOne({ _id: id, tenantId });
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
