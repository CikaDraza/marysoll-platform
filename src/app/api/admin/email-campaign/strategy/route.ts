// POST /api/admin/email-campaign/strategy
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { connectToDB } from "@/lib/db/mongodb";
import { runAgent } from "@/lib/ai/orchestrator";
import type { EmailCampaignTone } from "@/types/ai/email-campaign/aiEmailCampaign.types";

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "unlimitedAiTokens");
    if (denied) return denied;

    await connectToDB();

    const body = await req.json();
    const { salonIds, topic, audience, tone, useAverage } = body as {
      salonIds: string[];
      topic: string;
      audience?: string;
      tone: EmailCampaignTone;
      useAverage: boolean;
    };

    if (!Array.isArray(salonIds) || salonIds.length === 0) {
      return NextResponse.json(
        { error: "Izaberite najmanje jedan salon" },
        { status: 400 },
      );
    }

    if (!topic || !tone) {
      return NextResponse.json(
        { error: "topic i tone su obavezni" },
        { status: 400 },
      );
    }

    // The orchestrator resolves salonName from the DB using salonIds + tenantId.
    // salonName is required by EmailCampaignInput but overridden inside the orchestrator.
    const strategy = await runAgent("campaignStrategy", {
      salonIds,
      salonProfileIds: salonIds.join(","),
      salonName: "", // resolved by orchestrator from SalonProfile
      topic,
      audience,
      tone,
      tenantId: tenantId!,
      useAverage: useAverage ?? false,
    });

    return NextResponse.json(strategy);
  } catch (error: unknown) {
    console.error("[email-campaign/strategy] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri generisanju strategije",
      },
      { status: 500 },
    );
  }
}
