// app/api/newsletter/templates/[id]/update/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { type AdminAuthResult, requireAdmin } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";
import {
  newsletterScopeFilter,
  resolveNewsletterAdminScope,
} from "@/lib/newsletter/adminTenantScope";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
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
    const { id } = await context.params;
    const body = await request.json();
    const updated = await NewsletterTemplate.findOneAndUpdate(
      { _id: id, ...newsletterScopeFilter(newsletterScope) },
      body,
      { new: true, runValidators: true },
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Templejt nije pronađen" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Greška prilikom ažuriranja",
      },
      { status: 500 },
    );
  }
}
