// app/api/newsletter/verify/route.ts
import { verifyNewsletterSubscription } from "@/lib/newsletterService";
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { AudienceContact } from "@/models/AudienceContact";
import { Tenant } from "@/models/Tenant";
import { Types } from "mongoose";
import { platformOrigin, tenantOrigin } from "@/lib/platform/host-context";

/** Salon kome pretplatnik pripada — u okruženju iz koga je link otvoren. */
async function resolveTenantBaseUrl(
  token: string,
  req: NextRequest,
): Promise<string> {
  const fallback = platformOrigin(req);
  try {
    await connectToDB();
    const contact = (await AudienceContact.findOne({
      verificationToken: token,
    })
      .select("tenantId")
      .lean()) as { tenantId?: Types.ObjectId } | null;

    if (!contact?.tenantId) return fallback;

    const tenant = (await Tenant.findById(contact.tenantId)
      .select("slug customDomain customDomainVerified")
      .lean()) as {
      slug?: string;
      customDomain?: string;
      customDomainVerified?: boolean;
    } | null;

    if (tenant?.slug) return tenantOrigin({ ...tenant, slug: tenant.slug }, req);
  } catch {
    // fall through
  }
  return fallback;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(
      `${platformOrigin(req)}/newsletter/verify-failed?reason=no-token`,
    );
  }

  // Resolve tenant base URL before verification clears the token
  const baseUrl = await resolveTenantBaseUrl(token, req);

  try {
    const result = await verifyNewsletterSubscription(token);

    if (result.success) {
      return NextResponse.redirect(`${baseUrl}/newsletter/verify-success`);
    } else {
      return NextResponse.redirect(
        `${baseUrl}/newsletter/verify-failed?reason=${result.message || "invalid"}`,
      );
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(
      `${baseUrl}/newsletter/verify-failed?reason=error`,
    );
  }
}
