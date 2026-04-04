/**
 * GET /api/campaigns/[id]/analytics
 *
 * Returns analytics for a single EmailCampaign:
 *   - campaign summary (topic, subject, status, sentAt)
 *   - metrics (recipients, delivered, opens, clicks, openRate, clickRate)
 *   - A/B test breakdown (if enabled)
 *   - opens/clicks timeline grouped by day (last 30 days)
 */
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { CampaignEvent } from "@/models/CampaignEvent";
import { Types } from "mongoose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectToDB();

    const campaign = await EmailCampaign.findOne({
      _id: id,
      tenantId,
    })
      .select("topic content optimization scheduling metrics abTest salonName createdAt")
      .lean<{
        topic: string;
        content: { subject: string };
        optimization: { optimizedSubject: string };
        scheduling: { status: string; sentAt?: Date };
        metrics: {
          recipients: number;
          delivered: number;
          opens: number;
          clicks: number;
          openRate: number;
          clickRate: number;
        };
        abTest: {
          enabled: boolean;
          variants: Array<{
            id: "A" | "B";
            subject: string;
            sent: number;
            opened: number;
          }>;
        };
        salonName: string;
        createdAt: Date;
      }>();

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ── Timeline: opens/clicks grouped by day ────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const timelineRaw = await CampaignEvent.aggregate([
      {
        $match: {
          campaignId: new Types.ObjectId(id),
          type: { $in: ["open", "click"] },
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Pivot into { date, opens, clicks }
    const timelineMap: Record<string, { date: string; opens: number; clicks: number }> = {};
    for (const row of timelineRaw) {
      const date = row._id.date as string;
      if (!timelineMap[date]) timelineMap[date] = { date, opens: 0, clicks: 0 };
      if (row._id.type === "open") timelineMap[date].opens = row.count;
      if (row._id.type === "click") timelineMap[date].clicks = row.count;
    }
    const timeline = Object.values(timelineMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // ── A/B breakdown ────────────────────────────────────────────────────────
    let abBreakdown = null;
    if (campaign.abTest?.enabled && campaign.abTest.variants.length >= 2) {
      const variants = campaign.abTest.variants.map((v) => ({
        id: v.id,
        subject: v.subject,
        sent: v.sent ?? 0,
        opened: v.opened ?? 0,
        openRate:
          v.sent > 0 ? Math.round((v.opened / v.sent) * 100 * 10) / 10 : 0,
      }));
      const winner = variants.reduce((a, b) =>
        a.openRate >= b.openRate ? a : b,
      );
      abBreakdown = { variants, winnerId: winner.id };
    }

    return NextResponse.json({
      campaign: {
        topic: campaign.topic,
        subject:
          campaign.optimization?.optimizedSubject ||
          campaign.content?.subject ||
          "",
        salonName: campaign.salonName,
        status: campaign.scheduling.status,
        sentAt: campaign.scheduling.sentAt,
        createdAt: campaign.createdAt,
      },
      metrics: campaign.metrics,
      timeline,
      abTest: abBreakdown,
    });
  } catch (err) {
    console.error("[GET /api/campaigns/[id]/analytics]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
