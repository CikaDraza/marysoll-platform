// POST /api/campaigns/schedule — save campaign and enqueue for sending
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { emailCampaignQueue } from "@/lib/queues/emailCampaignQueue";

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

    // Enqueue the send job — worker runs in a separate service
    const delay = Math.max(0, sendDate.getTime() - Date.now());
    await emailCampaignQueue.add(
      "send-campaign",
      { campaignId: campaign._id.toString() },
      { delay },
    );

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
