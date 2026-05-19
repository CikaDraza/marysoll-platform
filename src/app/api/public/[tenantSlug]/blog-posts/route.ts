import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "9", 10) || 9));

  try {
    await connectToDB();

    const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantId = (tenant as Record<string, unknown>)._id;

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
      data: JSON.parse(JSON.stringify(campaigns)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET /api/public/[tenantSlug]/blog-posts:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
