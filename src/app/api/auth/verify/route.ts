import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { Tenant } from "@/models/Tenant";
import {
  sendOwnerWelcomeEmail,
  sendClientWelcomeEmail,
  TRIAL_DAYS,
} from "@/lib/email/onboarding";

/**
 * GET /api/auth/verify?token=xxx&type=owner|client
 *
 * Verifies email by finding TenantUser with matching verificationToken.
 * type=owner  → also activates the tenant (trial start) + also verifies AuthUser
 * type=client → activates client account, sends welcome email
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const type = searchParams.get("type") ?? "client";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/verify-email?error=missing_token`);
  }

  try {
    await connectToDB();

    const now = new Date();

    // Look up TenantUser by verificationToken (tenant-scoped verification)
    const tenantUser = await TenantUser.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: now },
    });

    if (!tenantUser) {
      return NextResponse.redirect(`${baseUrl}/verify-email?error=invalid_or_expired`);
    }

    if (tenantUser.isEmailVerified) {
      if (type === "client") {
        const existingTenant = await Tenant.findById(tenantUser.tenantId).lean() as { slug: string } | null;
        const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
        const tenantLoginUrl = existingTenant
          ? `https://${existingTenant.slug}.${BASE_DOMAIN}/login`
          : `${baseUrl}/login`;
        return NextResponse.redirect(
          `${baseUrl}/verify-email?already_verified=true&loginUrl=${encodeURIComponent(tenantLoginUrl)}`,
        );
      }
      return NextResponse.redirect(`${baseUrl}/verify-email?already_verified=true`);
    }

    // Mark TenantUser email as verified
    tenantUser.isEmailVerified = true;
    tenantUser.verificationToken = null;
    tenantUser.verificationTokenExpiry = null;
    await tenantUser.save();

    if (type === "owner") {
      // Also verify the AuthUser (platform access)
      if (tenantUser.authUserId) {
        await AuthUser.findByIdAndUpdate(tenantUser.authUserId, {
          $set: {
            isEmailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
          },
        });
      }

      // Activate tenant + trial
      const tenant = await Tenant.findById(tenantUser.tenantId);
      if (tenant) {
        const trialDays = parseInt(process.env.DEFAULT_TRIAL_DAYS ?? String(TRIAL_DAYS));
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        const autoApprove = process.env.AUTO_APPROVE_TRIALS !== "false";

        tenant.verified = true;
        tenant.status = autoApprove ? "active" : "pending";
        tenant.isTrialActive = autoApprove;
        tenant.trialEndsAt = autoApprove ? trialEndsAt : null;
        await tenant.save();

        try {
          await sendOwnerWelcomeEmail({
            email: tenantUser.email,
            ownerName: tenantUser.name,
            salonName: tenant.name,
            subdomain: `${tenant.slug}.marysoll.com`,
            trialEndsAt,
          });
        } catch (e) {
          console.error("⚠️ Owner welcome email failed:", e);
        }
      }

      return NextResponse.redirect(`${baseUrl}/verify-email?success=owner`);
    } else {
      // Client verification — find tenant for welcome email branding
      let salonName = "salon";
      let salonUrl = baseUrl;

      const tenant = await Tenant.findById(tenantUser.tenantId);
      if (tenant) {
        salonName = tenant.name;
        salonUrl = `https://${tenant.slug}.marysoll.com`;
      }

      try {
        await sendClientWelcomeEmail({
          email: tenantUser.email,
          clientName: tenantUser.name,
          salonName,
          salonUrl,
          tenantId: tenantUser.tenantId.toString(),
        });
      } catch (e) {
        console.error("⚠️ Client welcome email failed:", e);
      }

      const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
      const tenantLoginUrl = tenant
        ? `https://${tenant.slug}.${BASE_DOMAIN}/login`
        : `${baseUrl}/login`;
      return NextResponse.redirect(
        `${baseUrl}/verify-email?success=client&loginUrl=${encodeURIComponent(tenantLoginUrl)}`,
      );
    }
  } catch (error) {
    console.error("❌ Verify error:", error);
    return NextResponse.redirect(`${baseUrl}/verify-email?error=server_error`);
  }
}

/**
 * POST /api/auth/verify — API call (no redirect)
 */
export async function POST(request: NextRequest) {
  const { token, type = "client" } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Token nije prosleđen." }, { status: 400 });
  }

  try {
    await connectToDB();

    const now = new Date();
    const tenantUser = await TenantUser.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: now },
    });

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Link za verifikaciju je nevažeći ili je istekao." },
        { status: 400 },
      );
    }

    if (tenantUser.isEmailVerified) {
      return NextResponse.json({ message: "Email je već verifikovan." });
    }

    tenantUser.isEmailVerified = true;
    tenantUser.verificationToken = null;
    tenantUser.verificationTokenExpiry = null;
    await tenantUser.save();

    if (type === "owner") {
      if (tenantUser.authUserId) {
        await AuthUser.findByIdAndUpdate(tenantUser.authUserId, {
          $set: {
            isEmailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
          },
        });
      }

      const tenant = await Tenant.findById(tenantUser.tenantId);
      if (tenant) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
        tenant.verified = true;
        tenant.status = "active";
        tenant.isTrialActive = true;
        tenant.trialEndsAt = trialEndsAt;
        await tenant.save();
      }
    }

    return NextResponse.json({ message: "Email je uspešno potvrđen!" });
  } catch (error) {
    console.error("❌ Verify POST error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
