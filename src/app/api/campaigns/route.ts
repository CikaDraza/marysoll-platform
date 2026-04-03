// GET /api/campaigns?status=draft|scheduled|sent|sending|failed
import { NextResponse } from "next/server";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import type { CampaignStatus } from "@/models/EmailCampaign";

const VALID_STATUSES: CampaignStatus[] = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
];

export async function GET(req: Request) {
  try {
    const authResult: AdminAuthResult = await requireAdmin(req);
    if (!authResult.success) return authResult.response;

    const tenantId = authResult.decoded.tenantId;
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") as CampaignStatus | null;

    await connectToDB();

    const filter: Record<string, unknown> = { tenantId };
    if (statusParam && VALID_STATUSES.includes(statusParam)) {
      filter["scheduling.status"] = statusParam;
    }

    const campaigns = await EmailCampaign.find(filter)
      .select(
        "_id topic salonName scheduling.status scheduling.sendAt scheduling.sentAt content.subject optimization.optimizedSubject metrics createdAt updatedAt",
      )
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ campaigns });
  } catch (error: unknown) {
    console.error("[GET /api/campaigns]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
