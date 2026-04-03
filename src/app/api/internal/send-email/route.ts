/**
 * POST /api/internal/send-email
 *
 * Called exclusively by the Railway BullMQ worker after it dequeues a
 * "send-campaign" job from Upstash/Redis.
 *
 * Protected by x-internal-api-key header (must match INTERNAL_API_KEY env var).
 *
 * Body: { campaignId: string }
 *
 * Flow:
 *  1. Auth check
 *  2. Load EmailCampaign from DB
 *  3. Collect CLIENT recipients for the tenant (via UserSalon → User)
 *  4. Send batch emails via Resend
 *  5. Mark campaign as "sent" + write metrics
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { UserSalon } from "@/models/UserSalon";
import { resend } from "@/lib/email/resend";

interface SendEmailPayload {
  campaignId: string;
}

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const apiKey = req.headers.get("x-internal-api-key");
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as SendEmailPayload;
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    }

    await connectToDB();

    // ── Load campaign ─────────────────────────────────────────────────────────
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.scheduling.status === "sent") {
      return NextResponse.json({ message: "Already sent" });
    }

    // Mark as "sending" immediately to prevent duplicate sends
    campaign.scheduling.status = "sending";
    await campaign.save();

    // ── Collect recipients ────────────────────────────────────────────────────
    // All active CLIENTs of the tenant
    type PopulatedUser = { _id: string; email: string; name: string };
    const userSalonDocs = await UserSalon.find({
      salonId: campaign.tenantId,
      role: "CLIENT",
      isActive: true,
    }).populate<{ userId: PopulatedUser }>("userId", "email name");

    const recipients = (userSalonDocs as Array<{ userId: PopulatedUser }>)
      .map((us) => us.userId)
      .filter((u): u is PopulatedUser => !!u && !!u.email);

    if (recipients.length === 0) {
      campaign.scheduling.status = "sent";
      campaign.scheduling.sentAt = new Date();
      campaign.metrics.recipients = 0;
      await campaign.save();
      return NextResponse.json({ message: "No recipients — marked sent", recipients: 0 });
    }

    // ── Send via Resend (batch, max 100 per call) ─────────────────────────────
    const subject =
      campaign.optimization?.optimizedSubject ||
      campaign.content?.subject ||
      campaign.salonName;

    const html = campaign.template?.html;
    if (!html) {
      campaign.scheduling.status = "failed";
      await campaign.save();
      return NextResponse.json(
        { error: "Campaign has no HTML template" },
        { status: 422 },
      );
    }

    const FROM = process.env.EMAIL_FROM ?? "noreply@marysoll.com";
    const BATCH_SIZE = 50;
    let sent = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const emails = batch.map((r) => ({
        from: FROM,
        to: r.email,
        subject,
        html,
      }));

      const { error } = await resend.batch.send(emails);
      if (error) {
        console.error("[send-email] Resend batch error:", error);
        // Continue with remaining batches — partial delivery is better than none
      } else {
        sent += batch.length;
      }
    }

    // ── Update campaign metrics ───────────────────────────────────────────────
    campaign.scheduling.status = "sent";
    campaign.scheduling.sentAt = new Date();
    campaign.metrics.recipients = sent;
    await campaign.save();

    return NextResponse.json({
      campaignId,
      status: "sent",
      recipients: sent,
    });
  } catch (err) {
    console.error("[POST /api/internal/send-email]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
