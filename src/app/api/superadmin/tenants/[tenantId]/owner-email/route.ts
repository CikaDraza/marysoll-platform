/**
 * PATCH /api/superadmin/tenants/[tenantId]/owner-email
 *
 * SuperAdmin only. Changes the salon OWNER's email across all places where it
 * lives as their identity:
 *   - TenantUser.email   → salon login (matched by /api/tenant-auth/login)
 *   - AuthUser.email     → platform identity (linked via authUserId)
 *   - SalonProfile.email → profile/display email
 *
 * Password is NOT touched — bcrypt hashes only the password, so it stays valid.
 * isEmailVerified is kept true so login is not blocked.
 *
 * Forced logout: changing TenantUser.email makes the owner's existing JWT carry
 * a stale email. /api/tenants/me and /api/tenant-auth/refresh reject on that
 * mismatch (401), so the owner is logged out on their next panel load.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { SalonProfile } from "@/models/SalonProfile";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

type Params = { params: Promise<{ tenantId: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  const body = (await req.json().catch(() => ({}))) as { newEmail?: string };
  const newEmail = (body.newEmail ?? "").toLowerCase().trim();

  if (!EMAIL_RE.test(newEmail)) {
    return NextResponse.json(
      { error: "Unesite ispravnu email adresu." },
      { status: 400 },
    );
  }

  await connectToDB();

  const owner = await TenantUser.findOne({ tenantId, role: "OWNER" });
  if (!owner) {
    return NextResponse.json(
      { error: "Vlasnik (OWNER) nije pronađen za ovaj salon." },
      { status: 404 },
    );
  }

  const oldEmail = owner.email;
  if (oldEmail.toLowerCase() === newEmail) {
    return NextResponse.json({ message: "Email je već postavljen na tu adresu." });
  }

  // Collision: another user in the SAME tenant with this email (unique {tenantId,email}).
  const dupTenantUser = await TenantUser.findOne({
    tenantId,
    email: newEmail,
    _id: { $ne: owner._id },
  }).select("_id");
  if (dupTenantUser) {
    return NextResponse.json(
      { error: "Korisnik sa ovim emailom već postoji u ovom salonu." },
      { status: 409 },
    );
  }

  // Collision: another AuthUser globally with this email (global unique index).
  if (owner.authUserId) {
    const dupAuth = await AuthUser.findOne({
      email: newEmail,
      _id: { $ne: owner.authUserId },
    }).select("_id");
    if (dupAuth) {
      return NextResponse.json(
        { error: "Nalog sa ovim emailom već postoji na platformi." },
        { status: 409 },
      );
    }
  }

  // Apply everywhere. Keep email verified so login is not blocked.
  owner.email = newEmail;
  owner.isEmailVerified = true;
  await owner.save();

  if (owner.authUserId) {
    await AuthUser.findByIdAndUpdate(owner.authUserId, {
      email: newEmail,
      isEmailVerified: true,
    });
  }

  await SalonProfile.updateOne({ tenantId }, { $set: { email: newEmail } });

  return NextResponse.json({
    success: true,
    message: `Email promenjen: ${oldEmail} → ${newEmail}. Vlasnik će biti izlogovan pri sledećem učitavanju panela.`,
    oldEmail,
    newEmail,
  });
}
