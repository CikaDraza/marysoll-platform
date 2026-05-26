// app/api/newsletter/templates/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";
import {
  newsletterScopeFilter,
  resolveNewsletterAdminScope,
} from "@/lib/newsletter/adminTenantScope";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
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

    const deleted = await NewsletterTemplate.findOneAndDelete({
      _id: id,
      ...newsletterScopeFilter(newsletterScope),
    });
    if (!deleted) {
      return NextResponse.json(
        { error: "Templejt nije pronađen" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Templejt obrisan" });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Greška" },
      { status: 500 },
    );
  }
}
