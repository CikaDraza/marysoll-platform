import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth/auth-server";

const SUPPORT_LINK = "https://marysoll.com/kontakt";

export async function POST(request: NextRequest) {
  try {
    await connectToDB();
    const { email, password, tenantSlug: tenantSlugFromBody } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email i lozinka su obavezni." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Resolve tenant slug from header (middleware/proxy) or request body (path-based routing).
    const tenantSlugFromHeader = request.headers.get("x-tenant-slug");
    const resolvedTenantSlug =
      tenantSlugFromHeader && tenantSlugFromHeader !== "default"
        ? tenantSlugFromHeader
        : typeof tenantSlugFromBody === "string" && tenantSlugFromBody
          ? tenantSlugFromBody
          : null;

    // ── SUPER_ADMIN platform login (no tenant slug) ────────────────────────
    // Only SUPER_ADMIN can log in without a tenant context.
    if (!resolvedTenantSlug) {
      const authUser = await AuthUser.findOne({ email: normalizedEmail });

      if (!authUser || authUser.platformRole !== "SUPER_ADMIN") {
        return NextResponse.json(
          {
            error: "Pristup nije dozvoljen bez konteksta salona.",
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
        null,
        null,
        true,
        "SUPER_ADMIN",
        null,
      );
      const refreshToken = generateRefreshToken(
        authUser._id.toString(),
        authUser.email,
        true,
        null,
        null,
        true,
      );

      return buildTokenResponse(accessToken, refreshToken, {
        id: authUser._id.toString(),
        email: authUser.email,
        name: "Super Admin",
        globalRole: "SUPER_ADMIN",
        isAdmin: true,
        isSuperAdmin: true,
        tenantId: null,
        tenantUserId: null,
      });
    }

    // ── Tenant-scoped login (all other roles) ─────────────────────────────
    const tenant = await Tenant.findOne({ slug: resolvedTenantSlug })
      .select("_id slug")
      .lean<{ _id: import("mongoose").Types.ObjectId; slug: string }>();

    if (!tenant) {
      return NextResponse.json(
        {
          error: "Salon nije pronađen. Proverite link ili kontaktirajte podršku.",
          hint: SUPPORT_LINK,
        },
        { status: 404 },
      );
    }

    // Find user by { tenantId, email } — completely tenant-isolated.
    const tenantUser = await TenantUser.findOne({
      tenantId: tenant._id,
      email: normalizedEmail,
    });

    if (!tenantUser) {
      return NextResponse.json(
        {
          error: "Nemate nalog na ovom salonu. Molimo registrujte se.",
          code: "NO_TENANT_ACCOUNT",
        },
        { status: 404 },
      );
    }

    const isValid = await bcrypt.compare(password, tenantUser.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Pogrešna lozinka. Pokušajte ponovo ili resetujte lozinku." },
        { status: 401 },
      );
    }

    if (!tenantUser.isEmailVerified) {
      return NextResponse.json(
        {
          error: "Email adresa nije verifikovana. Proverite inbox ili zatražite novi verifikacioni link.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 401 },
      );
    }

    if (tenantUser.status === "suspended") {
      return NextResponse.json(
        { error: "Vaš nalog je suspendovan. Kontaktirajte salon." },
        { status: 403 },
      );
    }

    // Mark as online
    await TenantUser.findByIdAndUpdate(tenantUser._id, {
      isOnline: true,
      lastActive: new Date(),
    });

    const isAdmin = ["OWNER", "ADMIN", "STAFF"].includes(tenantUser.role);
    const displayName = tenantUser.name || normalizedEmail.split("@")[0];

    // JWT: id = TenantUser._id (primary identifier for tenant-scoped operations)
    const accessToken = generateAccessToken(
      tenantUser._id.toString(),
      tenantUser.email,
      isAdmin,
      displayName,
      tenantUser._id.toString(),  // tenantUserId = same as id
      tenant._id.toString(),
      false,
      tenantUser.role,
      tenant.slug,
    );
    const refreshToken = generateRefreshToken(
      tenantUser._id.toString(),
      tenantUser.email,
      isAdmin,
      tenantUser._id.toString(),
      tenant._id.toString(),
      false,
    );

    return buildTokenResponse(accessToken, refreshToken, {
      id: tenantUser._id.toString(),
      email: tenantUser.email,
      name: displayName,
      globalRole: tenantUser.role,
      isAdmin,
      isSuperAdmin: false,
      tenantId: tenant._id.toString(),
      tenantUserId: tenantUser._id.toString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}

function buildTokenResponse(
  accessToken: string,
  refreshToken: string,
  user: {
    id: string;
    email: string;
    name: string;
    globalRole: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    tenantId: string | null;
    tenantUserId: string | null;
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
      tenantId: user.tenantId,
      tenantUserId: user.tenantUserId,
      isOnline: true,
      lastActive: new Date(),
    },
  });

  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    domain: isProd ? `.${baseDomain}` : undefined,
  });

  response.cookies.set("auth-token", accessToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    domain: isProd ? `.${baseDomain}` : undefined,
  });

  return response;
}
