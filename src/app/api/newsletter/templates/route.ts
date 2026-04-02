// app/api/newsletter/templates/route.ts
// GET /api/newsletter/templates
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";

export async function GET(request: Request) {
  const authResult: AdminAuthResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const tenantId = authResult.decoded.tenantId;

  const denied = await requireFeature(tenantId, "newsletterCampaigns");
  if (denied) return denied;

  await connectToDB();
  const templates = await NewsletterTemplate.find({ tenantId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(templates);
}
