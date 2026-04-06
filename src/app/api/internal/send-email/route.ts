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
 *  2. Load EmailCampaign from DB (idempotency: skip if already sent)
 *  3. Resolve recipients — audience segment or all active subscribed contacts
 *  4. Wrap inner HTML with wrapEmailLayout (salon branding, header, footer)
 *  5. If A/B test enabled: split audience 50/50, each half gets different subject
 *  6. Inject open-tracking pixel + wrap CTA with click-tracking URL
 *  7. Send batch emails via Resend (max 50 per call)
 *  8. Update campaign metrics + status
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { AudienceSegment } from "@/models/AudienceSegment";
import { AudienceContact } from "@/models/AudienceContact";
import { CampaignEvent } from "@/models/CampaignEvent";
import { resend } from "@/lib/email/resend";
import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";
import { Types } from "mongoose";

interface SendEmailPayload {
  campaignId: string;
}

type RecipientContact = { _id: string; email: string; firstName?: string; lastName?: string };

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.marysoll.com";

/** Escape special regex chars in a string */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Injects a tracking pixel before </body> and wraps the campaign's CTA URL
 * with a click-tracking redirect.
 */
function injectTracking(
  html: string,
  campaignId: string,
  userId: string,
  ctaUrl: string | undefined,
  variantId?: "A" | "B",
): string {
  const vParam = variantId ? `&v=${variantId}` : "";

  // 1. Open pixel
  const pixelUrl = `${APP_URL}/api/email/open?c=${campaignId}&u=${userId}${vParam}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;
  let out = html.includes("</body>")
    ? html.replace("</body>", `${pixel}\n</body>`)
    : html + pixel;

  // 2. CTA click-tracking (replace ctaUrl in href attributes)
  if (ctaUrl) {
    const trackUrl =
      `${APP_URL}/api/email/click?c=${campaignId}&u=${userId}${vParam}` +
      `&url=${encodeURIComponent(ctaUrl)}`;
    out = out.replace(
      new RegExp(escapeRegex(ctaUrl), "g"),
      trackUrl,
    );
  }

  return out;
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
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.scheduling.status === "sent") {
      return NextResponse.json({ message: "Already sent" });
    }

    // Mark as "sending" immediately — idempotency guard
    campaign.scheduling.status = "sending";
    await campaign.save();

    // ── Resolve recipients via AudienceContact ────────────────────────────────
    const contactQuery: Record<string, unknown> = {
      tenantId: campaign.tenantId,
      status: "ACTIVE",
      subscribed: true,
    };

    if (campaign.audienceSegmentId) {
      const segment = await AudienceSegment.findById(
        campaign.audienceSegmentId,
      ).lean<{ filters?: { roles?: string[]; tags?: string[] } }>();

      if (segment?.filters?.roles?.length) {
        contactQuery.contactType = { $in: segment.filters.roles };
      }
      if (segment?.filters?.tags?.length) {
        contactQuery.tags = { $in: segment.filters.tags };
      }
      // If segment exists but has no role/tag filters, fall through to all contacts
    }
    // No else: when no segment is selected, send to ALL active subscribed contacts
    // (CLIENT, NEWSLETTER, LEAD, etc.) — do not restrict by contactType.

    const contactDocs = await AudienceContact.find(contactQuery)
      .select("_id email firstName lastName")
      .lean<RecipientContact[]>();

    const recipients = contactDocs.filter((c): c is RecipientContact => !!c.email);

    if (recipients.length === 0) {
      campaign.scheduling.status = "sent";
      campaign.scheduling.sentAt = new Date();
      campaign.metrics.recipients = 0;
      campaign.metrics.delivered = 0;
      await campaign.save();
      return NextResponse.json({
        message: "No recipients — marked sent",
        recipients: 0,
      });
    }

    // ── Validate HTML template ────────────────────────────────────────────────
    const innerHtml = campaign.template?.html;
    if (!innerHtml) {
      campaign.scheduling.status = "failed";
      await campaign.save();
      return NextResponse.json(
        { error: "Campaign has no HTML template" },
        { status: 422 },
      );
    }

    // ── Wrap inner content with salon-branded layout ──────────────────────────
    // The AI agent produces only the inner <table> content. wrapEmailLayout adds
    // the full DOCTYPE shell, salon logo, header, footer and unsubscribe link.
    const html = await wrapEmailLayout({
      title: campaign.content?.subject ?? campaign.salonName,
      content: innerHtml,
      tenantId: campaign.tenantId?.toString() ?? null,
    });

    const ctaUrl = campaign.content?.ctaUrl || undefined;
    const FROM = process.env.EMAIL_FROM ?? "noreply@marysoll.com";
    const BATCH_SIZE = 50;
    const tenantId = campaign.tenantId;
    let totalSent = 0;

    // ── A/B Test split ────────────────────────────────────────────────────────
    const abEnabled =
      campaign.abTest?.enabled &&
      campaign.abTest.variants.length >= 2;

    if (abEnabled) {
      const varA = campaign.abTest.variants.find((v) => v.id === "A") ||
        campaign.abTest.variants[0];
      const varB = campaign.abTest.variants.find((v) => v.id === "B") ||
        campaign.abTest.variants[1];

      const halfIdx = Math.floor(recipients.length / 2);
      const groups: Array<{ variant: typeof varA; list: RecipientContact[]; id: "A" | "B" }> = [
        { variant: varA, list: recipients.slice(0, halfIdx), id: "A" },
        { variant: varB, list: recipients.slice(halfIdx), id: "B" },
      ];

      for (const group of groups) {
        const subject = group.variant.subject || campaign.content?.subject || campaign.salonName;
        let groupSent = 0;

        for (let i = 0; i < group.list.length; i += BATCH_SIZE) {
          const batch = group.list.slice(i, i + BATCH_SIZE);
          const emails = batch.map((r) => ({
            from: FROM,
            to: r.email,
            subject,
            html: injectTracking(html, campaignId, r._id, ctaUrl, group.id),
          }));

          const { error } = await resend.batch.send(emails);
          if (!error) {
            groupSent += batch.length;
            // Log sent events in background (non-blocking)
            CampaignEvent.insertMany(
              batch.map((r) => ({
                campaignId: new Types.ObjectId(campaignId),
                tenantId,
                recipientEmail: r.email,
                recipientUserId: new Types.ObjectId(r._id),
                type: "sent",
                variantId: group.id,
                timestamp: new Date(),
              })),
            ).catch((e) => console.error("[send-email] insertMany error", e));
          } else {
            console.error("[send-email] Resend batch error:", error);
          }
        }

        totalSent += groupSent;

        // Update variant sent count
        await EmailCampaign.findOneAndUpdate(
          { _id: campaignId, "abTest.variants.id": group.id },
          { $inc: { "abTest.variants.$.sent": groupSent } },
        );
      }
    } else {
      // ── Standard send ──────────────────────────────────────────────────────
      const subject =
        campaign.optimization?.optimizedSubject ||
        campaign.content?.subject ||
        campaign.salonName;

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const emails = batch.map((r) => ({
          from: FROM,
          to: r.email,
          subject,
          html: injectTracking(html, campaignId, r._id, ctaUrl),
        }));

        const { error } = await resend.batch.send(emails);
        if (!error) {
          totalSent += batch.length;
          CampaignEvent.insertMany(
            batch.map((r) => ({
              campaignId: new Types.ObjectId(campaignId),
              tenantId,
              recipientEmail: r.email,
              recipientUserId: new Types.ObjectId(r._id),
              type: "sent",
              timestamp: new Date(),
            })),
          ).catch((e) => console.error("[send-email] insertMany error", e));
        } else {
          console.error("[send-email] Resend batch error:", error);
        }
      }
    }

    // ── Update campaign metrics ───────────────────────────────────────────────
    const sentAt = new Date();
    campaign.scheduling.status = "sent";
    campaign.scheduling.sentAt = sentAt;
    campaign.metrics.recipients = totalSent;
    campaign.metrics.delivered = totalSent; // assume delivered = sent; will be refined by opens
    await campaign.save();

    // ── Stamp AudienceContact.lastEmailSent for all recipients ────────────────
    // Fire-and-forget: don't block the response on this update.
    const recipientIds = recipients.map((r) => r._id);
    AudienceContact.updateMany(
      { _id: { $in: recipientIds } },
      { $set: { lastEmailSent: sentAt } },
    ).catch((e) => console.error("[send-email] lastEmailSent update failed:", e));

    return NextResponse.json({
      campaignId,
      status: "sent",
      recipients: totalSent,
    });
  } catch (err) {
    console.error("[POST /api/internal/send-email]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
