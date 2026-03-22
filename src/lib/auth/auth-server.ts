/**
 * lib/auth/auth-server.ts
 *
 * SERVER-ONLY auth funkcije.
 * NE importovati ovo u Client Components ili hooks!
 * Koristi se isključivo u API route handlers i middleware-u.
 */
import "server-only";

import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import type { ITenant } from "@/models/Tenant";
import { DecodedToken } from "@/types/auth/types";

export function generateAccessToken(
  id: string,
  email: string,
  isAdmin: boolean,
  name: string,
  tenantId: string | null = null,
  isSuperAdmin = false,
): string {
  return jwt.sign(
    { id, email, isAdmin, name, tenantId, isSuperAdmin },
    process.env.JWT_SECRET!,
    { expiresIn: "30d" },
  );
}

export function generateRefreshToken(
  id: string,
  email: string,
  isAdmin: boolean,
  tenantId: string | null = null,
  isSuperAdmin = false,
): string {
  return jwt.sign(
    { id, email, isAdmin, tenantId, isSuperAdmin },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "30d" },
  );
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as DecodedToken;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(
  request: NextRequest | Request,
): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.split(" ")[1];
  if ("cookies" in request) {
    return (request as NextRequest).cookies.get("token")?.value ?? null;
  }
  return null;
}

export function getDecodedFromRequest(
  request: NextRequest,
): DecodedToken | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

/** Tenant resolution iz request headera (proxy.ts ih ubacuje) */
export async function resolveTenant(
  request: NextRequest,
): Promise<ITenant | null> {
  await connectToDB();
  const tenantSlug = request.headers.get("x-tenant-slug");
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const BASE_DOMAIN = "marysoll.com";

  if (!tenantSlug || tenantSlug === "default" || tenantSlug === "") return null;

  const bySlug = await Tenant.findOne({ slug: tenantSlug, status: "active" });
  if (bySlug) return bySlug;

  if (!hostname.endsWith(BASE_DOMAIN)) {
    return Tenant.findOne({
      customDomain: hostname,
      customDomainVerified: true,
      status: "active",
    });
  }

  return null;
}

/**
 * Guard za admin API rute.
 * Vraća { decoded } ako je korisnik autentifikovan i isAdmin=true.
 * Vraća NextResponse (401/403) ako nije.
 */

export type AdminAuthResult =
  | { success: true; decoded: DecodedToken }
  | { success: false; response: NextResponse };

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 },
      ),
    };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Nevažeći ili istekao token" },
        { status: 401 },
      ),
    };
  }

  try {
    await connectToDB();
    const user = await User.findById(decoded.id)
      .select("isAdmin") // tenantId već imaš u tokenu → ne treba dodatno tražiti
      .lean();

    if (!user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Korisnik nije pronađen" },
          { status: 401 },
        ),
      };
    }

    if (!user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Nemate administratorska prava" },
          { status: 403 },
        ),
      };
    }

    return { success: true, decoded };
  } catch (err) {
    console.error("requireAdmin error:", err);
    return {
      success: false,
      response: NextResponse.json(
        { error: "Greška na serveru" },
        { status: 500 },
      ),
    };
  }
}

/**
 * Guard za opštu autentifikaciju (bilo koji korisnik).
 */
export function requireAuth(
  request: NextRequest,
): { decoded: DecodedToken } | NextResponse {
  const decoded = getDecodedFromRequest(request);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { decoded };
}

/**
 * Guard za superadmin API rute.
 */
export function requireSuperAdmin(
  request: NextRequest,
): { decoded: DecodedToken } | NextResponse {
  const decoded = getDecodedFromRequest(request);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!decoded.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { decoded };
}

export function isTenantActive(tenant: ITenant | null): boolean {
  if (!tenant) return true;
  return tenant.paid && tenant.verified && tenant.status === "active";
}
