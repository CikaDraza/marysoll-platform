import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
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

    // Resolve tenant from header (injected by proxy for subdomain requests) or from
    // the request body (sent by path-based tenant login pages — localhost / marketing domain).
    // OWNER/SUPER_ADMIN logins carry no tenant context — their User.tenantId is null.
    const tenantSlugFromHeader = request.headers.get("x-tenant-slug");
    const resolvedTenantSlug =
      (tenantSlugFromHeader && tenantSlugFromHeader !== "default")
        ? tenantSlugFromHeader
        : (typeof tenantSlugFromBody === "string" && tenantSlugFromBody) ? tenantSlugFromBody : null;

    let loginTenantId: import("mongoose").Types.ObjectId | null = null;
    if (resolvedTenantSlug) {
      const tenantDoc = await Tenant.findOne({ slug: resolvedTenantSlug }).select("_id").lean<{ _id: import("mongoose").Types.ObjectId }>();
      if (tenantDoc) loginTenantId = tenantDoc._id;
    }

    // Find the user scoped to this tenant (same email can exist on multiple tenants).
    // OWNER users always have tenantId: null — they are platform-level identities.
    // Their tenant is linked via Tenant.ownerId, not User.tenantId.
    let user = await User.findOne({ email: normalizedEmail, tenantId: loginTenantId });

    // Fallback: logging in on a tenant subdomain but user not found there.
    // Check if this is the tenant owner (tenantId: null) logging in from their own subdomain.
    if (!user && loginTenantId) {
      const candidate = await User.findOne({
        email: normalizedEmail,
        tenantId: null,
        globalRole: "OWNER",
      });
      if (candidate) {
        const ownerTenant = await Tenant.findOne({
          ownerId: candidate._id,
          _id: loginTenantId,
        })
          .select("_id")
          .lean();
        if (ownerTenant) user = candidate;
      }
    }

    // Second fallback: platform login (no tenant header) but owner record still has
    // tenantId set from a pre-fix registration. Find by email + OWNER role only.
    if (!user && !loginTenantId) {
      user = await User.findOne({ email: normalizedEmail, globalRole: "OWNER" }) ?? null;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Korisnik sa ovom email adresom nije pronađen.",
          hint: `Kontaktirajte podršku: ${SUPPORT_LINK}`,
        },
        { status: 404 },
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Pogrešna lozinka. Pokušajte ponovo ili resetujte lozinku." },
        { status: 401 },
      );
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        {
          error:
            "Email adresa nije verifikovana. Proverite inbox ili zatražite novi verifikacioni link.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 401 },
      );
    }

    // Normalize globalRole — guard against stale documents without the field
    const effectiveRole = user.globalRole ?? "USER";
    const allowedRoles = ["SUPER_ADMIN", "OWNER", "ADMIN", "STAFF", "USER"];
    if (!allowedRoles.includes(effectiveRole)) {
      return NextResponse.json(
        {
          error: "Vaš nalog nema ispravno podešenu rolu. Kontaktirajte podršku.",
          hint: SUPPORT_LINK,
          code: "INVALID_ROLE",
        },
        { status: 403 },
      );
    }

    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastActive: new Date(),
    });

    // OWNER users have tenantId: null on their User document — resolve their tenant
    // via Tenant.ownerId so the JWT carries the correct tenantId and tenantSlug.
    let tenantId = user.tenantId?.toString() ?? null;
    let tenantSlug = resolvedTenantSlug ?? null;

    if (effectiveRole === "OWNER" && !tenantId) {
      const ownerTenant = await Tenant.findOne({ ownerId: user._id })
        .select("_id slug")
        .lean<{ _id: import("mongoose").Types.ObjectId; slug: string }>();
      if (ownerTenant) {
        tenantId = ownerTenant._id.toString();
        tenantSlug = ownerTenant.slug;
      }
    }

    const accessToken = generateAccessToken(
      user._id.toString(),
      user.email,
      user.isAdmin,
      user.name ?? user.email.split("@")[0],
      tenantId,
      user.isSuperAdmin ?? false,
      effectiveRole,
      tenantSlug,
    );
    const refreshToken = generateRefreshToken(
      user._id.toString(),
      user.email,
      user.isAdmin,
      tenantId,
      user.isSuperAdmin ?? false,
    );

    const isProd = process.env.NODE_ENV === "production";
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

    const response = NextResponse.json({
      message: "Prijava uspešna",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole ?? "USER",
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin ?? false,
        tenantId,
        isOnline: true,
        lastActive: new Date(),
      },
    });

    // refreshToken cookie: dostupan na SVIM subdomenima (.marysoll.com)
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      domain: isProd ? `.${baseDomain}` : undefined,
    });

    // accessToken cookie: čitljiv JS-om, shared across subdomains
    response.cookies.set("auth-token", accessToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      domain: isProd ? `.${baseDomain}` : undefined,
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
