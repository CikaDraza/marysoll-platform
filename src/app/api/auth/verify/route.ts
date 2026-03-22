import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { sendOwnerWelcomeEmail, sendClientWelcomeEmail, TRIAL_DAYS } from "@/lib/email/onboarding";

/**
 * GET /api/auth/verify?token=xxx&type=owner|client
 *
 * Koristi se kada korisnik klikne link iz emaila.
 * type=owner  → aktivira tenant + trial, šalje welcome email vlasniku
 * type=client → aktivira klijentski nalog, šalje welcome email klijentu
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
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: now },
    });

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/verify-email?error=invalid_or_expired`);
    }

    if (user.isEmailVerified) {
      // Već verifikovan — preusmeri na login
      return NextResponse.redirect(`${baseUrl}/login?already_verified=true`);
    }

    // Označi email kao verifikovan
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    if (type === "owner") {
      // ─── Aktivacija salona i probnog perioda ───────────────────────────────
      const tenant = await Tenant.findOne({ ownerId: user._id });
      if (tenant) {
        // Use DEFAULT_TRIAL_DAYS env var if set, else fall back to TRIAL_DAYS constant
        const trialDays = parseInt(process.env.DEFAULT_TRIAL_DAYS ?? String(TRIAL_DAYS));
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        // Auto-approve trial unless platform settings say otherwise
        const autoApprove = process.env.AUTO_APPROVE_TRIALS !== "false";

        tenant.verified = true;
        tenant.status = autoApprove ? "active" : "pending";
        tenant.isTrialActive = autoApprove;
        tenant.trialEndsAt = autoApprove ? trialEndsAt : null;
        await tenant.save();

        // Pošalji welcome email sa info o trialu
        try {
          const salonProfile = await SalonProfile.findOne({ tenantId: tenant._id });
          await sendOwnerWelcomeEmail({
            email: user.email,
            ownerName: user.name,
            salonName: tenant.name,
            subdomain: `${tenant.slug}.marysoll.com`,
            trialEndsAt,
          });
        } catch (emailErr) {
          console.error("⚠️ Owner welcome email nije poslat:", emailErr);
        }
      }

      return NextResponse.redirect(`${baseUrl}/verify-email?success=owner`);
    } else {
      // ─── Aktivacija klijentskog naloga ─────────────────────────────────────
      // Nađi salon kom pripada klijent (via tenantId)
      let salonName = "salon";
      let salonUrl = baseUrl;

      if (user.tenantId) {
        const tenant = await Tenant.findById(user.tenantId);
        if (tenant) {
          salonName = tenant.name;
          salonUrl = `https://${tenant.slug}.marysoll.com`;
        }
      }

      try {
        await sendClientWelcomeEmail({
          email: user.email,
          clientName: user.name,
          salonName,
          salonUrl,
        });
      } catch (emailErr) {
        console.error("⚠️ Client welcome email nije poslat:", emailErr);
      }

      return NextResponse.redirect(`${baseUrl}/verify-email?success=client`);
    }
  } catch (error) {
    console.error("❌ Verify error:", error);
    return NextResponse.redirect(`${baseUrl}/verify-email?error=server_error`);
  }
}

/**
 * POST /api/auth/verify
 * Alternativno — API poziv umesto GET redirect (za custom implementacije)
 */
export async function POST(request: NextRequest) {
  const { token, type = "client" } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Token nije prosleđen." }, { status: 400 });
  }

  try {
    await connectToDB();

    const now = new Date();
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: now },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Link za verifikaciju je nevažeći ili je istekao." },
        { status: 400 }
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ message: "Email je već verifikovan." });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    if (type === "owner") {
      const tenant = await Tenant.findOne({ ownerId: user._id });
      if (tenant) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
        tenant.verified = true;
        tenant.status = "active";
        tenant.isTrialActive = true;
        tenant.trialEndsAt = trialEndsAt;
        await tenant.save();

        try {
          await sendOwnerWelcomeEmail({
            email: user.email,
            ownerName: user.name,
            salonName: tenant.name,
            subdomain: `${tenant.slug}.marysoll.com`,
            trialEndsAt,
          });
        } catch (e) {
          console.error("⚠️ Welcome email error:", e);
        }
      }
    }

    return NextResponse.json({ message: "Email je uspešno potvrđen!" });
  } catch (error) {
    console.error("❌ Verify POST error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
