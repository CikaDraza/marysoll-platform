import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDB } from "@/lib/db/mongodb";
import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import { sendResetEmail, sendResetEmailOnAssistant } from "@/lib/email/email";

const MANAGEMENT_ROLES = ["OWNER", "ADMIN", "STAFF"] as const;

const GENERIC_RESPONSE = {
  message: "Ako nalog postoji, reset link će biti poslat na email",
};

/**
 * POST /api/auth/forgot-password
 *
 * Password reset prati isti kontekst kao login:
 * - salon URL: TenantUser po { tenantId, email }, potpuno tenant-isolated;
 * - platform /login: management TenantUser po emailu, odnosno SUPER_ADMIN.
 * Odgovor je uvek generički da ne otkriva da li nalog postoji.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, assistantSlug, isAssistant, tenantSlug: bodyTenantSlug } =
      await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email je obavezan" }, { status: 400 });
    }

    await connectToDB();

    const normalizedEmail = email.toLowerCase().trim();

    // Resolve tenant from header or body
    const tenantSlugFromHeader = request.headers.get("x-tenant-slug");
    const resolvedTenantSlug =
      tenantSlugFromHeader && tenantSlugFromHeader !== "default"
        ? tenantSlugFromHeader
        : bodyTenantSlug || null;

    let tenantUser = null;
    let tenant: {
      _id: import("mongoose").Types.ObjectId;
      name: string;
    } | null = null;

    if (resolvedTenantSlug) {
      // Salon login: reset ostaje strogo ograničen na taj salon.
      tenant = await Tenant.findOne({ slug: resolvedTenantSlug })
        .select("_id name")
        .lean<{ _id: import("mongoose").Types.ObjectId; name: string }>();

      if (tenant) {
        tenantUser = await TenantUser.findOne({
          tenantId: tenant._id,
          email: normalizedEmail,
        });
      }
    } else {
      // Platform login (/login) nema tenant slug. Traži isti management nalog
      // koji bira /api/auth/login, inače UI prijavi "poslato" bez slanja mejla.
      tenantUser = await TenantUser.findOne({
        email: normalizedEmail,
        role: { $in: MANAGEMENT_ROLES },
      }).sort({ role: 1 });

      if (tenantUser) {
        tenant = await Tenant.findById(tenantUser.tenantId)
          .select("_id name")
          .lean<{ _id: import("mongoose").Types.ObjectId; name: string }>();
      }

      // SUPER_ADMIN se takođe prijavljuje preko platformskog /login-a, ali
      // nema TenantUser zapis. Njegov reset zato ostaje u AuthUser modelu.
      if (!tenantUser) {
        const authUser = await AuthUser.findOne({
          email: normalizedEmail,
          platformRole: "SUPER_ADMIN",
        });

        if (!authUser) return NextResponse.json(GENERIC_RESPONSE);

        const resetToken = crypto.randomBytes(32).toString("hex");
        authUser.resetPasswordToken = resetToken;
        authUser.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
        await authUser.save();
        await sendResetEmail(authUser.email, resetToken, "korisniče");
        return NextResponse.json(GENERIC_RESPONSE);
      }
    }

    // Security: always return same message — don't reveal whether account exists
    if (!tenantUser || !tenant) return NextResponse.json(GENERIC_RESPONSE);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    tenantUser.resetPasswordToken = resetToken;
    tenantUser.resetPasswordExpiry = resetTokenExpiry;
    await tenantUser.save();

    if (isAssistant && assistantSlug) {
      await sendResetEmailOnAssistant(tenantUser.email, resetToken, assistantSlug);
    } else {
      await sendResetEmail(
        tenantUser.email,
        resetToken,
        tenantUser.name,
        tenant._id.toString(),
      );
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
