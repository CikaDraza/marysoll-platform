import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import { sendResetEmail, sendResetEmailOnAssistant } from "@/lib/email/email";

/**
 * POST /api/auth/forgot-password
 *
 * Tenant-scoped password reset.
 * Finds TenantUser by { tenantId, email } — completely isolated per salon.
 * The same email on a different salon gets a separate reset token.
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

    if (!resolvedTenantSlug) {
      // Security: same generic message whether tenant found or not
      return NextResponse.json({
        message: "Ako nalog postoji, reset link će biti poslat na email",
      });
    }

    const tenant = await Tenant.findOne({ slug: resolvedTenantSlug })
      .select("_id name")
      .lean<{ _id: import("mongoose").Types.ObjectId; name: string }>();

    if (!tenant) {
      return NextResponse.json({
        message: "Ako nalog postoji, reset link će biti poslat na email",
      });
    }

    const tenantUser = await TenantUser.findOne({
      tenantId: tenant._id,
      email: normalizedEmail,
    });

    // Security: always return same message — don't reveal whether account exists
    if (!tenantUser) {
      return NextResponse.json({
        message: "Ako nalog postoji, reset link će biti poslat na email",
      });
    }

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

    return NextResponse.json({
      message: "Ako nalog postoji, reset link će biti poslat na email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
