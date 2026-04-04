/**
 * GET /api/campaigns/analytics
 *
 * Returns aggregated analytics for all sent EmailCampaigns of the tenant:
 *   - summary (totalCampaigns, avgOpenRate, avgClickRate, totalRecipients)
 *   - per-campaign list sorted by sentAt desc
 *   - monthly trend (last 6 months)
 */
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { Types } from "mongoose";

export async function GET(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const rawTenantId = authResult.decoded.tenantId;
    if (!rawTenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = new Types.ObjectId(rawTenantId);

    await connectToDB();

    // All sent campaigns
    const campaigns = await EmailCampaign.find({
      tenantId,
      "scheduling.status": "sent",
    })
      .select(
        "topic content.subject optimization.optimizedSubject scheduling.sentAt metrics abTest",
      )
      .sort({ "scheduling.sentAt": -1 })
      .lean<
        Array<{
          _id: string;
          topic: string;
          content: { subject: string };
          optimization: { optimizedSubject: string };
          scheduling: { sentAt?: Date };
          metrics: {
            recipients: number;
            delivered: number;
            opens: number;
            clicks: number;
            openRate: number;
            clickRate: number;
          };
          abTest: { enabled: boolean };
        }>
      >();

    if (campaigns.length === 0) {
      return NextResponse.json({
        summary: {
          totalCampaigns: 0,
          avgOpenRate: 0,
          avgClickRate: 0,
          totalRecipients: 0,
        },
        campaigns: [],
        trend: [],
      });
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalCampaigns = campaigns.length;
    const totalRecipients = campaigns.reduce(
      (s, c) => s + (c.metrics?.recipients ?? 0),
      0,
    );
    const avgOpenRate =
      campaigns.reduce((s, c) => s + (c.metrics?.openRate ?? 0), 0) /
      totalCampaigns;
    const avgClickRate =
      campaigns.reduce((s, c) => s + (c.metrics?.clickRate ?? 0), 0) /
      totalCampaigns;

    // ── Monthly trend (last 6 months) ─────────────────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trendRaw = await EmailCampaign.aggregate([
      {
        $match: {
          tenantId,
          "scheduling.status": "sent",
          "scheduling.sentAt": { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: "%Y-%m",
                date: "$scheduling.sentAt",
              },
            },
          },
          campaigns: { $sum: 1 },
          avgOpenRate: { $avg: "$metrics.openRate" },
          avgClickRate: { $avg: "$metrics.clickRate" },
          totalRecipients: { $sum: "$metrics.recipients" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    const trend = trendRaw.map((row) => ({
      month: row._id.month,
      campaigns: row.campaigns,
      avgOpenRate: Math.round((row.avgOpenRate ?? 0) * 10) / 10,
      avgClickRate: Math.round((row.avgClickRate ?? 0) * 10) / 10,
      totalRecipients: row.totalRecipients,
    }));

    return NextResponse.json({
      summary: {
        totalCampaigns,
        totalRecipients,
        avgOpenRate: Math.round(avgOpenRate * 10) / 10,
        avgClickRate: Math.round(avgClickRate * 10) / 10,
      },
      campaigns: campaigns.map((c) => ({
        id: c._id,
        topic: c.topic,
        subject: c.optimization?.optimizedSubject || c.content?.subject || "",
        sentAt: c.scheduling?.sentAt,
        metrics: c.metrics,
        hasAbTest: c.abTest?.enabled ?? false,
      })),
      trend,
    });
  } catch (err) {
    console.error("[GET /api/campaigns/analytics]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
