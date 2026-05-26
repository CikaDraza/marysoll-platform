// app/api/newsletter/templates/route.ts
// GET /api/newsletter/templates
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";
import {
  newsletterScopeFilter,
  resolveNewsletterAdminScope,
} from "@/lib/newsletter/adminTenantScope";

export async function GET(request: Request) {
  const authResult: AdminAuthResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const newsletterScope = await resolveNewsletterAdminScope(
    request,
    authResult.decoded,
  );
  if (!newsletterScope) {
    return NextResponse.json(
      { error: "Newsletter scope nije validan" },
      { status: 403 },
    );
  }

  if (newsletterScope.scope === "tenant") {
    const denied = await requireFeature(
      newsletterScope.tenantId,
      "newsletterCampaigns",
    );
    if (denied) return denied;
  }

  await connectToDB();
  const templates = await NewsletterTemplate.find(newsletterScopeFilter(newsletterScope))
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(templates);
}
