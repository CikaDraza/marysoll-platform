/**
 * GET /api/campaigns/[id]/recipients
 *
 * Returns the list of recipients for a campaign:
 *  - SENT campaigns   → actual recipients from CampaignEvent (type=sent)
 *  - DRAFT/SCHEDULED  → preview of who would receive it (same query as send-email)
 *
 * Response:
 *   { count: number; recipients: { email: string; name?: string }[]; source: "sent" | "preview" }
 */
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { AudienceContact } from "@/models/AudienceContact";
import { AudienceSegment } from "@/models/AudienceSegment";
import { CampaignEvent } from "@/models/CampaignEvent";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    const { id } = await ctx.params;

    await connectToDB();

    const campaign = await EmailCampaign.findOne({ _id: id, tenantId }).lean<{
      tenantId: unknown;
      audienceSegmentId?: unknown;
      scheduling: { status: string };
    }>();

    if (!campaign) {
      return NextResponse.json({ error: "Kampanja nije pronađena" }, { status: 404 });
    }

    // ── SENT: return actual recipients from CampaignEvent ─────────────────────
    if (campaign.scheduling.status === "sent" || campaign.scheduling.status === "sending") {
      const events = await CampaignEvent.find({ campaignId: id, type: "sent" })
        .select("recipientEmail")
        .lean<{ recipientEmail: string }[]>();

      const unique = [...new Set(events.map((e) => e.recipientEmail))];
      const recipients = unique.map((email) => ({ email }));

      return NextResponse.json({
        count: recipients.length,
        recipients,
        source: "sent" as const,
      });
    }

    // ── DRAFT / SCHEDULED: preview query (same logic as send-email) ───────────
    const contactQuery: Record<string, unknown> = {
      tenantId: campaign.tenantId,
      status: "ACTIVE",
      subscribed: true,
    };

    if (campaign.audienceSegmentId) {
      const segment = await AudienceSegment.findById(campaign.audienceSegmentId).lean<{
        filters?: { roles?: string[]; tags?: string[] };
      }>();
      if (segment?.filters?.roles?.length) {
        contactQuery.contactType = { $in: segment.filters.roles };
      }
      if (segment?.filters?.tags?.length) {
        contactQuery.tags = { $in: segment.filters.tags };
      }
    }

    const contacts = await AudienceContact.find(contactQuery)
      .select("email firstName lastName")
      .lean<{ email: string; firstName?: string; lastName?: string }[]>();

    const recipients = contacts
      .filter((c) => !!c.email)
      .map((c) => ({
        email: c.email,
        name: [c.firstName, c.lastName].filter(Boolean).join(" ") || undefined,
      }));

    return NextResponse.json({
      count: recipients.length,
      recipients,
      source: "preview" as const,
    });
  } catch (err) {
    console.error("[GET /api/campaigns/[id]/recipients]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
