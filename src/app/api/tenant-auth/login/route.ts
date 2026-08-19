/**
 * POST /api/tenant-auth/login
 *
 * Tenant-scoped login. Uses TenantUser ONLY.
 * Tenant slug MUST be present (injected by proxy as x-tenant-slug, or sent in body).
 *
 * Issues:
 *   - tenant-access-token cookie  (JS-readable,  domain: undefined — per-subdomain)
 *   - tenant-refresh-token cookie (HttpOnly,      domain: undefined — per-subdomain)
 *
 * JWT payload type = "tenant"
 *
 * NEVER mixes AuthUser here.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth/auth-server";
import { buildTenantTokenResponse } from "@/lib/auth/tokenResponse";
import { platformUrl } from "@/lib/platform/host-context";

const supportLink = (req: NextRequest) => platformUrl("/kontakt", req);

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

    // Resolve tenant slug from proxy header or request body
    const tenantSlugFromHeader = request.headers.get("x-tenant-slug");
    const resolvedTenantSlug =
      tenantSlugFromHeader && tenantSlugFromHeader !== "default"
        ? tenantSlugFromHeader
        : typeof tenantSlugFromBody === "string" && tenantSlugFromBody
          ? tenantSlugFromBody
          : null;

    if (!resolvedTenantSlug) {
      return NextResponse.json(
        {
          error: "Prijava zahteva kontekst salona.",
          hint: supportLink(request),
        },
        { status: 400 },
      );
    }

    const tenant = await Tenant.findOne({ slug: resolvedTenantSlug })
      .select("_id slug")
      .lean<{ _id: import("mongoose").Types.ObjectId; slug: string }>();

    if (!tenant) {
      return NextResponse.json(
        {
          error: "Salon nije pronađen. Proverite link ili kontaktirajte podršku.",
          hint: supportLink(request),
        },
        { status: 404 },
      );
    }

    // Find user strictly by { tenantId, email } — fully tenant-isolated
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

    const accessToken = generateAccessToken(
      tenantUser._id.toString(),
      tenantUser.email,
      isAdmin,
      displayName,
      tenantUser._id.toString(),
      tenant._id.toString(),
      false,
      tenantUser.role,
      tenant.slug,
      "tenant",
    );
    const refreshToken = generateRefreshToken(
      tenantUser._id.toString(),
      tenantUser.email,
      isAdmin,
      tenantUser._id.toString(),
      tenant._id.toString(),
      false,
      "tenant",
    );

    return buildTenantTokenResponse(accessToken, refreshToken, {
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
    console.error("❌ Tenant login error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
