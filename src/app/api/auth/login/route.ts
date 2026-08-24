/**
 * POST /api/auth/login
 *
 * Unified platform login — for all management roles:
 *   SUPER_ADMIN  → platform token  → superadmin.marysoll.com/superadmin/dashboard
 *   OWNER/ADMIN/STAFF → tenant token → admin.marysoll.com/auth/callback?token=...
 *
 * CLIENT role is rejected here — clients use /api/tenant-auth/login (salon URL).
 *
 * Issues:
 *   SUPER_ADMIN:
 *     - platform-access-token cookie  (JS-readable,  domain: .marysoll.com)
 *     - platform-refresh-token cookie (HttpOnly,      domain: .marysoll.com)
 *   OWNER/ADMIN/STAFF:
 *     - tenant-access-token cookie  (JS-readable,  domain: undefined)
 *     - tenant-refresh-token cookie (HttpOnly,      domain: undefined)
 *
 * JWT type = "platform" for SUPER_ADMIN, "tenant" for management roles.
 *
 * NEVER mixes CLIENT login here — clients use /api/tenant-auth/login.
 */
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
import {
  buildPlatformTokenResponse,
  buildTenantTokenResponse,
} from "@/lib/auth/tokenResponse";

const MANAGEMENT_ROLES = ["OWNER", "ADMIN", "STAFF"] as const;

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

    // ── 1. Try SUPER_ADMIN via AuthUser ────────────────────────────────────────
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
        authUser._id.toString(),
        authUser.email,
        true,
        "Super Admin",
        null,
        null,
        true,
        "SUPER_ADMIN",
        null,
        "platform",
      );
      const refreshToken = generateRefreshToken(
        authUser._id.toString(),
        authUser.email,
        true,
        null,
        null,
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
    }

    // ── 2. Try management roles via TenantUser ─────────────────────────────────
    // Prioritize OWNER, then ADMIN, then STAFF
    const tenantUser = await TenantUser.findOne({
      email: normalizedEmail,
      role: { $in: MANAGEMENT_ROLES },
    }).sort({ role: 1 }); // ADMIN < OWNER < STAFF — for consistent ordering

    if (!tenantUser) {
      // Nema upravljačkog naloga za ovaj email. Po lifecycle ugovoru salon
      // NIKADA ne postoji bez vlasnika, a vlasnik ne može obrisati samo svoj
      // nalog dok poseduje salon — pa „OWNER bez salona" nije legitimno stanje
      // i ovde se ne pravi izuzetak. Ako se ipak pojavi, to je integrity
      // incident za superadmina, ne korisnički tok.
      return NextResponse.json(
        { error: "Pristup nije dozvoljen." },
        { status: 403 },
      );
    }

    const isValid = await bcrypt.compare(password, tenantUser.password);
    if (!isValid) {
      return NextResponse.json({ error: "Pogrešna lozinka." }, { status: 401 });
    }

    if (!tenantUser.isEmailVerified) {
      return NextResponse.json(
        { error: "Email adresa nije verifikovana.", code: "EMAIL_NOT_VERIFIED" },
        { status: 401 },
      );
    }

    if (tenantUser.status === "suspended") {
      return NextResponse.json(
        { error: "Vaš nalog je suspendovan. Kontaktirajte salon." },
        { status: 403 },
      );
    }

    const tenant = await Tenant.findById(tenantUser.tenantId)
      .select("_id slug")
      .lean<{ _id: import("mongoose").Types.ObjectId; slug: string }>();

    if (!tenant) {
      return NextResponse.json(
        { error: "Salon nije pronađen." },
        { status: 404 },
      );
    }

    // Mark as online
    await TenantUser.findByIdAndUpdate(tenantUser._id, {
      isOnline: true,
      lastActive: new Date(),
    });

    const displayName = tenantUser.name || normalizedEmail.split("@")[0];

    const accessToken = generateAccessToken(
      tenantUser._id.toString(),
      tenantUser.email,
      true,
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
      true,
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
      isAdmin: true,
      isSuperAdmin: false,
      tenantId: tenant._id.toString(),
      tenantUserId: tenantUser._id.toString(),
    });
  } catch (error) {
    console.error("❌ Platform login error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
