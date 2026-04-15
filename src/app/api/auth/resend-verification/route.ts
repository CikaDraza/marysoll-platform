import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import {
  sendClientVerificationEmail,
  sendOwnerVerificationEmail,
} from "@/lib/email/onboarding";

/**
 * POST /api/auth/resend-verification
 *
 * Tenant-scoped: resends verification email for the given email on the
 * current tenant. Each salon manages its own verification independently.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const { email, tenantSlug: bodyTenantSlug } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email je obavezan." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const tenantSlugFromHeader = req.headers.get("x-tenant-slug");
    const resolvedTenantSlug =
      tenantSlugFromHeader && tenantSlugFromHeader !== "default"
        ? tenantSlugFromHeader
        : bodyTenantSlug || null;

    if (!resolvedTenantSlug) {
      return NextResponse.json({
        message: "Ako nalog postoji i nije verifikovan, novi link je poslat.",
      });
    }

    const tenant = await Tenant.findOne({ slug: resolvedTenantSlug }).lean<{
      _id: import("mongoose").Types.ObjectId;
      name: string;
      slug: string;
    }>();

    if (!tenant) {
      return NextResponse.json({
        message: "Ako nalog postoji i nije verifikovan, novi link je poslat.",
      });
    }

    const tenantUser = await TenantUser.findOne({
      tenantId: tenant._id,
      email: normalizedEmail,
    });

    // Always return same message to prevent enumeration
    if (!tenantUser || tenantUser.isEmailVerified) {
      return NextResponse.json({
        message: "Ako nalog postoji i nije verifikovan, novi link je poslat.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    tenantUser.verificationToken = verificationToken;
    tenantUser.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await tenantUser.save();

    const salonBaseUrl = `https://${tenant.slug}.marysoll.com`;

    if (tenantUser.role === "OWNER") {
      await sendOwnerVerificationEmail({
        email: tenantUser.email,
        ownerName: tenantUser.name,
        salonName: tenant.name,
        verificationToken,
        subdomain: `${tenant.slug}.marysoll.com`,
      });
    } else {
      await sendClientVerificationEmail({
        email: tenantUser.email,
        clientName: tenantUser.name,
        salonName: tenant.name,
        verificationToken,
        salonBaseUrl,
        tenantId: tenant._id.toString(),
      });
    }

    return NextResponse.json({
      message: "Ako nalog postoji i nije verifikovan, novi link je poslat.",
    });
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
