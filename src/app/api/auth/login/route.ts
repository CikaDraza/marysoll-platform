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
    let tenantUser = await TenantUser.findOne({
      email: normalizedEmail,
      role: { $in: MANAGEMENT_ROLES },
    }).sort({ role: 1 }); // ADMIN < OWNER < STAFF — for consistent ordering

    if (!tenantUser) {
      // ── Vlasnik bez salona ────────────────────────────────────────────────
      // Salon i nalog su NAMERNO odvojeni: vlasnica sme da obriše salon a
      // zadrži nalog, da bi kasnije napravila novi. Do sada je takav nalog
      // ovde dobijao 403 i bio potpuno zaključan, iako je `AuthUser` živ i
      // verifikovan. Sada se prijavljuje i dobija token bez tenanta.
      if (authUser) {
        const isValidAuth = await bcrypt.compare(
          password,
          authUser.passwordHash ?? "",
        );
        if (!isValidAuth) {
          return NextResponse.json(
            { error: "Pogrešna lozinka." },
            { status: 401 },
          );
        }
        if (!authUser.isEmailVerified) {
          return NextResponse.json(
            {
              error: "Email adresa nije verifikovana.",
              code: "EMAIL_NOT_VERIFIED",
            },
            { status: 401 },
          );
        }

        // Samoisceljenje: salon postoji i `ownerId` dokazuje vlasništvo, a samo
        // je veza (`TenantUser`) nestala. Vlasništvo je dokazivo, pa se veza
        // vraća umesto da nalog ostane zaključan.
        const ownedTenant = await Tenant.findOne({ ownerId: authUser._id });
        if (ownedTenant) {
          const restored = await TenantUser.create({
            tenantId: ownedTenant._id,
            authUserId: authUser._id,
            email: authUser.email,
            name: authUser.email.split("@")[0],
            password: authUser.passwordHash,
            role: "OWNER",
            isEmailVerified: true,
          });
          console.error(
            JSON.stringify({
              event: "OWNER_TENANTUSER_RESTORED",
              authUserId: authUser._id.toString(),
              tenantId: ownedTenant._id.toString(),
              timestamp: new Date().toISOString(),
            }),
          );
          tenantUser = restored;
        } else {
          // Nema salona — prijava prolazi, ali token nema tenant kontekst.
          const name = authUser.email.split("@")[0];
          const accessToken = generateAccessToken(
            authUser._id.toString(),
            authUser.email,
            false,
            name,
            null,
            null,
            false,
            authUser.platformRole ?? "OWNER",
            null,
            "platform",
          );
          const refreshToken = generateRefreshToken(
            authUser._id.toString(),
            authUser.email,
            false,
            null,
            null,
            false,
            "platform",
          );
          const res = buildPlatformTokenResponse(accessToken, refreshToken, {
            id: authUser._id.toString(),
            email: authUser.email,
            name,
            globalRole: authUser.platformRole ?? "OWNER",
            isAdmin: false,
            isSuperAdmin: false,
          });
          return res;
        }
      } else {
        // Could be a CLIENT trying to use this endpoint, or simply no account
        return NextResponse.json(
          { error: "Pristup nije dozvoljen." },
          { status: 403 },
        );
      }
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
