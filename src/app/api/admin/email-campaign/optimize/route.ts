// POST /api/admin/email-campaign/optimize
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { runAgent } from "@/lib/ai/orchestrator";
import type { EmailCampaignContent } from "@/types/ai/email-campaign/aiEmailCampaign.types";

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "unlimitedAiTokens");
    if (denied) return denied;

    const content = (await req.json()) as EmailCampaignContent;

    if (!content.title && !content.body) {
      return NextResponse.json(
        { error: "Sadržaj kampanje nije kompletan" },
        { status: 400 },
      );
    }

    const optimization = await runAgent("campaignOptimization", content);

    return NextResponse.json(optimization);
  } catch (error: unknown) {
    console.error("[email-campaign/optimize] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri optimizaciji kampanje",
      },
      { status: 500 },
    );
  }
}
