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

    const campaigns = await NewsletterCampaign.find({
      tenantId,
      campaignType: "email-landing",
      "landingPage.enabled": true,
      "landingPage.status": "published",
    });

    if (!campaigns) {
      return NextResponse.json({ error: "Not any campaign" }, { status: 403 });
    }

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Error fetching campaigns" },
      { status: 500 },
    );
  }
}
