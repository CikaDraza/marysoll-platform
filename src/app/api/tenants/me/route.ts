/**
 * GET /api/tenants/me
 * Returns current admin's tenant public data.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const auth = (await requireAdmin(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;
    const { decoded } = auth;

    if (!decoded.tenantId) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 404 },
      );
    }

    const tenant = await Tenant.findById(decoded.tenantId)
      .select(
        "slug subdomain customDomain customDomainVerified plan status isTrialActive trialEndsAt cloudinaryFolder zohoOrgId emailInboxProvider emailInboxStatus verifiedInboxEmails emailHostingProvider emailHostingStatus emailInboxDomain",
      )
      .lean();

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 404 },
      );
    }

    const t = tenant as Record<string, unknown>;
    const salonProfile = await SalonProfile.findOne({
      tenantId: decoded.tenantId,
    })
      .select("resendApiKey")
      .lean<{ resendApiKey?: string } | null>();

    return NextResponse.json({
      slug: String(t.slug ?? ""),
      subdomain: String(t.subdomain ?? ""),
      cloudinaryFolder: String(t.cloudinaryFolder ?? ""),
      customDomain: t.customDomain ? String(t.customDomain) : null,
      customDomainVerified: Boolean(t.customDomainVerified),
      plan: String(t.plan ?? "maria"),
      status: String(t.status ?? "pending"),
      isTrialActive: Boolean(t.isTrialActive),
      trialEndsAt: t.trialEndsAt ? String(t.trialEndsAt) : null,
      zohoOrgId: t.zohoOrgId ? String(t.zohoOrgId) : null,
      emailInboxProvider: String(t.emailInboxProvider ?? "none"),
      emailInboxStatus: String(t.emailInboxStatus ?? "not_configured"),
      verifiedInboxEmails: Array.isArray(t.verifiedInboxEmails)
        ? t.verifiedInboxEmails.map(String)
        : [],
      emailHostingProvider: String(t.emailHostingProvider ?? "none"),
      emailHostingStatus: String(t.emailHostingStatus ?? "not_configured"),
      emailInboxDomain: String(t.emailInboxDomain ?? ""),
      hasResendApiKey: Boolean(salonProfile?.resendApiKey),
    });
  } catch (err) {
    console.error("GET /api/tenants/me:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
