// src/app/api/newsletter/campaigns/[id]/generate-seo/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { generateSeoMetadata } from "@/lib/ai/orchestrator";
import { extractTextFromBlocks } from "@/lib/conversational/ai/extractTextFromBlocks";
import { LayoutBlock } from "@/types/conversational/layout";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

interface RequestBody {
  layout: LayoutBlock[];
  titleSeed?: string;
  keywords?: string[];
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "aiSeoGeneration");
    if (denied) return denied;

    await connectToDB();
    const { id } = await context.params;
    const body: RequestBody = await req.json();

    if (!body.layout || body.layout.length === 0) {
      return NextResponse.json(
        { error: "Layout is required for SEO generation" },
        { status: 400 },
      );
    }

    const campaign = await NewsletterCampaign.findOne({ _id: id, tenantId });
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    const textContent = extractTextFromBlocks(body.layout);

    const seo = await generateSeoMetadata({
      titleSeed: body.titleSeed || campaign.subject,
      content: textContent,
      keywords: body.keywords || campaign.semanticContent?.keywords || [],
    });

    return NextResponse.json({ seo });
  } catch (error) {
    console.error("SEO generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "SEO generation failed",
      },
      { status: 500 },
    );
  }
}
