/**
 * POST /api/auth/login
 *
 * Platform-only login. Uses AuthUser ONLY.
 * Only SUPER_ADMIN can authenticate here.
 * Tenant users MUST use /api/tenant-auth/login instead.
 *
 * Issues:
 *   - platform-access-token cookie  (JS-readable,  domain: .marysoll.com)
 *   - platform-refresh-token cookie (HttpOnly,      domain: .marysoll.com)
 *
 * JWT payload type = "platform"
 *
 * NEVER mixes TenantUser here.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { AuthUser } from "@/models/AuthUser";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth/auth-server";

const SUPPORT_LINK = "https://marysoll.com/kontakt";

export async function POST(request: NextRequest) {
  try {
    await connectToDB();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email i lozinka su obavezni." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Platform login is exclusively for SUPER_ADMIN via AuthUser
    const authUser = await AuthUser.findOne({ email: normalizedEmail });

    if (!authUser || authUser.platformRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          error: "Pristup nije dozvoljen. Koristite /api/tenant-auth/login za prijavu na salon.",
          hint: SUPPORT_LINK,
        },
        { status: 403 },
      );
    }

    const isValid = await bcrypt.compare(password, authUser.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Pogrešna lozinka." },
        { status: 401 },
      );
    }

    if (!authUser.isEmailVerified) {
      return NextResponse.json(
        { error: "Email adresa nije verifikovana.", code: "EMAIL_NOT_VERIFIED" },
        { status: 401 },
      );
    }

    const accessToken = generateAccessToken(
      authUser._id.toString(),
      authUser.email,
      true,
      "Super Admin",
      null,   // no tenantUserId for platform
      null,   // no tenantId for platform
      true,
      "SUPER_ADMIN",
      null,   // no tenantSlug for platform
      "platform",
    );
    const refreshToken = generateRefreshToken(
      authUser._id.toString(),
      authUser.email,
      true,
      null,   // no tenantUserId
      null,   // no tenantId
      true,
      "platform",
    );

    return buildPlatformTokenResponse(accessToken, refreshToken, {
      id: authUser._id.toString(),
      email: authUser.email,
      name: "Super Admin",
      globalRole: "SUPER_ADMIN",
      isAdmin: true,
      isSuperAdmin: true,
    });
  } catch (error) {
    console.error("❌ Platform login error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}

function buildPlatformTokenResponse(
  accessToken: string,
  refreshToken: string,
  user: {
    id: string;
    email: string;
    name: string;
    globalRole: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  },
) {
  const isProd = process.env.NODE_ENV === "production";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

  const response = NextResponse.json({
    message: "Prijava uspešna",
    token: accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      globalRole: user.globalRole,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      tenantId: null,
      tenantUserId: null,
      isOnline: true,
      lastActive: new Date(),
    },
  });

  // domain: .marysoll.com → accessible from all platform subdomains
  response.cookies.set("platform-refresh-token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    domain: isProd ? `.${baseDomain}` : undefined,
  });

  response.cookies.set("platform-access-token", accessToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    domain: isProd ? `.${baseDomain}` : undefined,
  });

  return response;
}
