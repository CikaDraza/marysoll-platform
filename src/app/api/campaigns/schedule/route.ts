// POST /api/campaigns/schedule — save campaign and mark it scheduled
//
// Architecture note:
//   This route ONLY writes to MongoDB. It does NOT touch Redis.
//   A long-running worker on Railway polls MongoDB every 60 s for campaigns
//   whose sendAt has passed and processes them via /api/internal/send-email.
//
//   This avoids IORedis TCP connection issues in Vercel serverless functions.
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";

interface ScheduleBody {
  campaignId: string;
  sendAt: string; // ISO date string
}

export async function POST(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "unlimitedAiTokens");
    if (denied) return denied;

    await connectToDB();

    const body = (await req.json()) as ScheduleBody;
    const { campaignId, sendAt } = body;

    if (!campaignId || !sendAt) {
      return NextResponse.json(
        { error: "campaignId i sendAt su obavezni" },
        { status: 400 },
      );
    }

    const sendDate = new Date(sendAt);
    if (isNaN(sendDate.getTime())) {
      return NextResponse.json(
        { error: "Nevažeći format datuma za sendAt" },
        { status: 400 },
      );
    }

    const campaign = await EmailCampaign.findOneAndUpdate(
      { _id: campaignId, tenantId },
      {
        $set: {
          "scheduling.status": "scheduled",
          "scheduling.sendAt": sendDate,
        },
      },
      { new: true },
    );

    if (!campaign) {
      return NextResponse.json(
        { error: "Kampanja nije pronađena" },
        { status: 404 },
      );
    }

    // The Railway worker polls MongoDB every 60 s and picks this up automatically.
    return NextResponse.json({
      campaignId: campaign._id.toString(),
      status: "scheduled",
      sendAt: sendDate.toISOString(),
    });
  } catch (error: unknown) {
    console.error("[campaigns/schedule] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri zakazivanju kampanje",
      },
      { status: 500 },
    );
  }
}
