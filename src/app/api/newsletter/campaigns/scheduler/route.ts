// app/api/newsletter/campaigns/scheduler/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { sendCampaignEmails } from "@/lib/newsletterService";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

export async function GET(req: NextRequest) {
  try {
    // Extra sigurnost (iako middleware već propušta)
    if (!req.headers.get("x-vercel-cron")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const now = new Date();

    /**
     * ENTERPRISE RECOVERY:
     * - Pokupi scheduled kampanje
     * - Pokupi sending starije od 30 min (stuck recovery)
     */
    const campaigns = await NewsletterCampaign.find({
      $or: [
        {
          status: "scheduled",
          scheduledFor: { $lte: now },
        },
        {
          status: "sending",
          sentAt: { $lte: new Date(Date.now() - 1000 * 60 * 30) },
        },
      ],
    });

    let started = 0;

    for (const campaign of campaigns) {
      /**
       * Atomic lock
       */
      const locked = await NewsletterCampaign.findOneAndUpdate(
        {
          _id: campaign._id,
          status: { $in: ["scheduled", "sending"] },
        },
        {
          status: "sending",
          sentAt: now,
        },
        { new: true },
      );

      if (!locked) continue;

      try {
        await sendCampaignEmails(locked._id.toString());

        await NewsletterCampaign.updateOne(
          { _id: locked._id },
          { status: "sent" },
        );
      } catch (err) {
        console.error("Scheduler send error:", err);

        await NewsletterCampaign.updateOne(
          { _id: locked._id },
          { status: "failed" },
        );
      }

      started++;
    }

    return NextResponse.json({
      ok: true,
      processed: campaigns.length,
      started,
    });
  } catch (err) {
    console.error("Scheduler fatal error:", err);
    return NextResponse.json({ error: "Scheduler failed" }, { status: 500 });
  }
}
