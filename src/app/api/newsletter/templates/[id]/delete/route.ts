// app/api/newsletter/templates/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";

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

    const tenantId = authResult.decoded.tenantId;

    const denied = await requireFeature(tenantId, "newsletterCampaigns");
    if (denied) return denied;

    await connectToDB();

    const deleted = await NewsletterTemplate.findOneAndDelete({
      _id: id,
      tenantId,
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
