/**
 * executeSend — core campaign send logic.
 *
 * Called directly by the Vercel cron (/api/cron) and via HTTP by
 * the Railway worker (/api/internal/send-email).
 *
 * Returns { status, recipients } or throws on unrecoverable error.
 */
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { AudienceSegment } from "@/models/AudienceSegment";
import { AudienceContact } from "@/models/AudienceContact";
import { CampaignEvent } from "@/models/CampaignEvent";
import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";
import { resolveTenantNewsletterSender } from "@/lib/email/tenantEmailSettings";
import { Types } from "mongoose";
import { platformOrigin } from "@/lib/platform/host-context";

type RecipientContact = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

/** Origin okruženja iz koga kampanja ide (tracking/unsubscribe linkovi). */
const APP_URL = platformOrigin();

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function injectTracking(
  html: string,
  campaignId: string,
  userId: string,
  ctaUrl: string | undefined,
  variantId?: "A" | "B",
): string {
  const vParam = variantId ? `&v=${variantId}` : "";

  const pixelUrl = `${APP_URL}/api/email/open?c=${campaignId}&u=${userId}${vParam}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;
  let out = html.includes("</body>")
    ? html.replace("</body>", `${pixel}\n</body>`)
    : html + pixel;

  if (ctaUrl) {
    const trackUrl =
      `${APP_URL}/api/email/click?c=${campaignId}&u=${userId}${vParam}` +
      `&url=${encodeURIComponent(ctaUrl)}`;
    out = out.replace(new RegExp(escapeRegex(ctaUrl), "g"), trackUrl);
  }

  return out;
}

export type ExecuteSendResult =
  | { status: "already_sent" }
  | { status: "no_recipients" }
  | { status: "no_template" }
  | { status: "sent"; recipients: number };

export async function executeSend(campaignId: string): Promise<ExecuteSendResult> {
  await connectToDB();

  // ── Load campaign ───────────────────────────────────────────────────────────
  const campaign = await EmailCampaign.findById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  if (campaign.scheduling.status === "sent") {
    return { status: "already_sent" };
  }

  campaign.scheduling.status = "sending";
  await campaign.save();

  // ── Resolve recipients ──────────────────────────────────────────────────────
  let contactDocs: RecipientContact[];

  if (campaign.recipientContactIds?.length) {
    // Manual override — send only to the selected contacts
    contactDocs = await AudienceContact.find({
      _id: { $in: campaign.recipientContactIds },
      tenantId: campaign.tenantId,
    })
      .select("_id email firstName lastName")
      .lean<RecipientContact[]>();
  } else {
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
    }

    contactDocs = await AudienceContact.find(contactQuery)
      .select("_id email firstName lastName")
      .lean<RecipientContact[]>();
  }

  const recipients = contactDocs.filter(
    (c): c is RecipientContact => !!c.email,
  );

  if (recipients.length === 0) {
    campaign.scheduling.status = "sent";
    campaign.scheduling.sentAt = new Date();
    campaign.metrics.recipients = 0;
    campaign.metrics.delivered = 0;
    await campaign.save();
    return { status: "no_recipients" };
  }

  // ── Validate template ───────────────────────────────────────────────────────
  const innerHtml = campaign.template?.html;
  if (!innerHtml) {
    campaign.scheduling.status = "failed";
    await campaign.save();
    return { status: "no_template" };
  }

  // ── Wrap with salon-branded layout ──────────────────────────────────────────
  const ctaUrl = campaign.content?.ctaUrl || undefined;

  // Fix CTA placeholder: AI generates href="#" when ctaUrl was empty at generation time.
  // Replace all href="#" with the actual ctaUrl before wrapping.
  const fixedInnerHtml = ctaUrl
    ? innerHtml.replace(/href="#"/gi, `href="${ctaUrl}"`)
    : innerHtml;

  const html = await wrapEmailLayout({
    title: campaign.content?.subject ?? campaign.salonName,
    content: fixedInnerHtml,
    tenantId: campaign.tenantId?.toString() ?? null,
  });
  const sender = await resolveTenantNewsletterSender(
    campaign.tenantId?.toString() ?? null,
  );
  const FROM = sender.from;
  const emailClient = sender.client;
  const BATCH_SIZE = 50;
  const tenantId = campaign.tenantId;
  let totalSent = 0;

  // ── A/B Test split ──────────────────────────────────────────────────────────
  const abEnabled =
    campaign.abTest?.enabled && campaign.abTest.variants.length >= 2;

  if (abEnabled) {
    const varA =
      campaign.abTest.variants.find((v) => v.id === "A") ||
      campaign.abTest.variants[0];
    const varB =
      campaign.abTest.variants.find((v) => v.id === "B") ||
      campaign.abTest.variants[1];

    const halfIdx = Math.floor(recipients.length / 2);
    const groups: Array<{
      variant: typeof varA;
      list: RecipientContact[];
      id: "A" | "B";
    }> = [
      { variant: varA, list: recipients.slice(0, halfIdx), id: "A" },
      { variant: varB, list: recipients.slice(halfIdx), id: "B" },
    ];

    for (const group of groups) {
      const subject =
        group.variant.subject ||
        campaign.content?.subject ||
        campaign.salonName;
      let groupSent = 0;

      for (let i = 0; i < group.list.length; i += BATCH_SIZE) {
        const batch = group.list.slice(i, i + BATCH_SIZE);
        const emails = batch.map((r) => ({
          from: FROM,
          to: r.email,
          subject,
          html: injectTracking(html, campaignId, r._id, ctaUrl, group.id),
          replyTo: sender.replyTo,
        }));

        const { error } = await emailClient.batch.send(emails);
        if (!error) {
          groupSent += batch.length;
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
          ).catch((e) => console.error("[executeSend] insertMany error", e));
        } else {
          console.error("[executeSend] Resend batch error:", error);
        }
      }

      totalSent += groupSent;

      await EmailCampaign.findOneAndUpdate(
        { _id: campaignId, "abTest.variants.id": group.id },
        { $inc: { "abTest.variants.$.sent": groupSent } },
      );
    }
  } else {
    // ── Standard send ─────────────────────────────────────────────────────────
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
        replyTo: sender.replyTo,
      }));

      const { error } = await emailClient.batch.send(emails);
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
        ).catch((e) => console.error("[executeSend] insertMany error", e));
      } else {
        console.error("[executeSend] Resend batch error:", error);
      }
    }
  }

  // ── Update metrics ──────────────────────────────────────────────────────────
  const sentAt = new Date();
  campaign.scheduling.status = "sent";
  campaign.scheduling.sentAt = sentAt;
  campaign.metrics.recipients = totalSent;
  campaign.metrics.delivered = totalSent;
  await campaign.save();

  const recipientIds = recipients.map((r) => r._id);
  AudienceContact.updateMany(
    { _id: { $in: recipientIds } },
    { $set: { lastEmailSent: sentAt } },
  ).catch((e) => console.error("[executeSend] lastEmailSent update failed:", e));

  return { status: "sent", recipients: totalSent };
}
