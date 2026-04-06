/**
 * GET /api/cron
 *
 * Vercel Cron Job — runs once per day at 12:15 UTC (Hobby plan limit).
 * Finds all campaigns with status="scheduled" and sendAt <= now,
 * claims each atomically, then calls /api/internal/send-email for each.
 *
 * Protected by Vercel's CRON_SECRET (Authorization: Bearer <secret>).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.marysoll.com";

export async function GET(req: NextRequest) {
  // Vercel injects Authorization: Bearer <CRON_SECRET> on every cron invocation
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDB();

  const now = new Date();
  const apiKey = process.env.INTERNAL_API_KEY ?? "";
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
    console.log(`[cron] Dispatching campaign ${campaignId}`);

    try {
      const res = await fetch(`${APP_URL}/api/internal/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ campaignId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[cron] Campaign ${campaignId} failed: HTTP ${res.status} ${text}`);
        await EmailCampaign.findByIdAndUpdate(campaignId, {
          $set: { "scheduling.status": "failed" },
        });
      } else {
        processed++;
        console.log(`[cron] Campaign ${campaignId} dispatched OK`);
      }
    } catch (err) {
      console.error(`[cron] Campaign ${campaignId} error:`, err);
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        $set: { "scheduling.status": "failed" },
      });
    }
  } while (claimed);

  return NextResponse.json({ ok: true, processed });
}
