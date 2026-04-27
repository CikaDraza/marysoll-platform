/**
 * POST /api/marketplace/auth/login
 *
 * Marketplace-scoped login for CLIENT (USER/GUEST) users.
 * Does a cross-tenant lookup by email, verifies password, and issues a
 * tenant-scoped JWT — same shape as /api/tenant-auth/login.
 *
 * Falls through auth hierarchy:
 *   1. AuthUser SUPER_ADMIN  → platform token
 *   2. TenantUser OWNER/ADMIN/STAFF → tenant token (most-recently-active wins)
 *   3. TenantUser USER/GUEST → tenant token (most-recently-active wins)
 *
 * If the same email exists in multiple tenants with the same password,
 * the most recently active record wins — acceptable for marketplace UX.
 *
 * Protected by HMAC signature (same as all marketplace routes).
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import { verifySignature } from "@/lib/middleware/verifySignature";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth/auth-server";
import type { Types } from "mongoose";

export async function POST(req: NextRequest) {
  const verify = verifySignature(req, await req.clone().text());
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  try {
    await connectToDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email i lozinka su obavezni." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── 1. SUPER_ADMIN via AuthUser ────────────────────────────────────────────
    const authUser = await AuthUser.findOne({ email: normalizedEmail });
    if (authUser && authUser.platformRole === "SUPER_ADMIN") {
      const isValid = await bcrypt.compare(password, authUser.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Pogrešna lozinka." }, { status: 401 });
      }
      if (!authUser.isEmailVerified) {
        return NextResponse.json(
          { error: "Email adresa nije verifikovana.", code: "EMAIL_NOT_VERIFIED" },
          { status: 401 },
        );
      }
      const accessToken = generateAccessToken(
        authUser._id.toString(), authUser.email, true, "Super Admin",
        null, null, true, "SUPER_ADMIN", null, "platform",
      );
      const refreshToken = generateRefreshToken(
        authUser._id.toString(), authUser.email, true, null, null, true, "platform",
      );
      return buildResponse({ token: accessToken, refreshToken, user: {
        id: authUser._id.toString(), email: authUser.email, name: "Super Admin",
        globalRole: "SUPER_ADMIN", isAdmin: true, isSuperAdmin: true,
        tenantId: null, tenantUserId: null,
      }});
    }

    // ── 2 & 3. TenantUser — any role, cross-tenant ────────────────────────────
    // Find all records with this email, sorted by most recently active.
    const candidates = await TenantUser.find({ email: normalizedEmail })
      .sort({ lastActive: -1 })
      .lean<Array<{
        _id: Types.ObjectId;
        tenantId: Types.ObjectId;
        email: string;
        password: string;
        name: string;
        role: string;
        isEmailVerified: boolean;
        status: string;
      }>>();

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "Pogrešan email ili lozinka." },
        { status: 401 },
      );
    }

    // Find the first candidate whose password matches.
    let matchedUser: (typeof candidates)[0] | null = null;
    for (const candidate of candidates) {
      const isValid = await bcrypt.compare(password, candidate.password);
      if (isValid) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: "Pogrešan email ili lozinka." },
        { status: 401 },
      );
    }

    if (!matchedUser.isEmailVerified) {
      return NextResponse.json(
        { error: "Email adresa nije verifikovana. Proverite inbox.", code: "EMAIL_NOT_VERIFIED" },
        { status: 401 },
      );
    }

    if (matchedUser.status === "suspended") {
      return NextResponse.json(
        { error: "Vaš nalog je suspendovan. Kontaktirajte salon." },
        { status: 403 },
      );
    }

    const tenant = await Tenant.findById(matchedUser.tenantId)
      .select("_id slug")
      .lean<{ _id: Types.ObjectId; slug: string }>();

    if (!tenant) {
      return NextResponse.json(
        { error: "Salon nije pronađen." },
        { status: 404 },
      );
    }

    // Mark as online
    await TenantUser.findByIdAndUpdate(matchedUser._id, {
      isOnline: true,
      lastActive: new Date(),
    });

    const isAdmin = ["OWNER", "ADMIN", "STAFF"].includes(matchedUser.role);
    const displayName = matchedUser.name || normalizedEmail.split("@")[0];

    const accessToken = generateAccessToken(
      matchedUser._id.toString(), matchedUser.email, isAdmin, displayName,
      matchedUser._id.toString(), tenant._id.toString(), false,
      matchedUser.role, tenant.slug, "tenant",
    );
    const refreshToken = generateRefreshToken(
      matchedUser._id.toString(), matchedUser.email, isAdmin,
      matchedUser._id.toString(), tenant._id.toString(), false, "tenant",
    );

    return buildResponse({ token: accessToken, refreshToken, user: {
      id: matchedUser._id.toString(), email: matchedUser.email, name: displayName,
      globalRole: matchedUser.role, isAdmin, isSuperAdmin: false,
      tenantId: tenant._id.toString(), tenantUserId: matchedUser._id.toString(),
    }});
  } catch (error) {
    console.error("❌ Marketplace auth login error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}

function buildResponse({ token, refreshToken, user }: {
  token: string;
  refreshToken: string;
  user: {
    id: string; email: string; name: string; globalRole: string;
    isAdmin: boolean; isSuperAdmin: boolean;
    tenantId: string | null; tenantUserId: string | null;
  };
}) {
  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.json({
    message: "Prijava uspešna",
    token,
    user: { ...user, isOnline: true, lastActive: new Date() },
  });

  const cookieName = user.isSuperAdmin ? "platform" : "tenant";
  const domain = user.isSuperAdmin && isProd
    ? `.${process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com"}`
    : undefined;

  res.cookies.set(`${cookieName}-refresh-token`, refreshToken, {
    httpOnly: true, secure: isProd, sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, path: "/", domain,
  });
  res.cookies.set(`${cookieName}-access-token`, token, {
    httpOnly: false, secure: isProd, sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, path: "/", domain,
  });

  return res;
}
