// POST /api/admin/email-campaign/content
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { runAgent } from "@/lib/ai/orchestrator";
import type { EmailCampaignStrategy } from "@/types/ai/email-campaign/aiEmailCampaign.types";

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "unlimitedAiTokens");
    if (denied) return denied;

    const strategy = (await req.json()) as EmailCampaignStrategy;

    if (!strategy.campaignGoal || !strategy.targetAudience) {
      return NextResponse.json(
        { error: "Strategija kampanje nije kompletna" },
        { status: 400 },
      );
    }

    const content = await runAgent("campaignContent", strategy);

    return NextResponse.json(content);
  } catch (error: unknown) {
    console.error("[email-campaign/content] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri generisanju sadržaja",
      },
      { status: 500 },
    );
  }
}
