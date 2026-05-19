import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectToDB();
    const tenantId = req.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

    const filter = {
      tenantId,
      campaignType: "email-landing",
      "landingPage.enabled": true,
      "landingPage.status": "published",
    };

    const [campaigns, total] = await Promise.all([
      NewsletterCampaign.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NewsletterCampaign.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: campaigns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Error fetching campaigns" },
      { status: 500 },
    );
  }
}
