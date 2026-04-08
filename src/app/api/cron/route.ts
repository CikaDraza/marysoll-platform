/**
 * GET /api/cron
 *
 * Vercel Cron Job — runs once per day at 12:15 UTC (Hobby plan).
 * Finds all campaigns with status="scheduled" and sendAt <= now,
 * claims each atomically, then calls executeSend() directly (no HTTP).
 *
 * Protected by Vercel's CRON_SECRET (Authorization: Bearer <secret>).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { executeSend } from "@/lib/campaigns/executeSend";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDB();

  const now = new Date();
  let processed = 0;
  let claimed: { _id: { toString(): string } } | null;

  do {
    claimed = await EmailCampaign.findOneAndUpdate(
      {
        "scheduling.status": "scheduled",
        "scheduling.sendAt": { $lte: now },
      },
      { $set: { "scheduling.status": "sending" } },
      { new: false },
    ).lean();

    if (!claimed) break;

    const campaignId = claimed._id.toString();

    try {
      await executeSend(campaignId);
      processed++;
    } catch (err) {
      console.error(`[cron] Campaign ${campaignId} failed:`, err);
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        $set: { "scheduling.status": "failed" },
      });
    }
  } while (claimed);

  return NextResponse.json({ ok: true, processed });
}
