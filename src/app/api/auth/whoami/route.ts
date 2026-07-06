// src/app/api/auth/whoami/route.ts
//
// GET /api/auth/whoami
// Read-only session probe. Vraća osnovne podatke o trenutno prijavljenom
// korisniku na osnovu access cookie-ja (tenant-access-token / platform-access-token).
//
// Zašto postoji: marketing sajt (marysoll.com) NE vidi tenant vlasnika jer je
// `tenant-access-token` host-only cookie na admin.marysoll.com, a localStorage je
// per-origin. Marketing sajt zato cross-origin (same-site) fetch-uje ovaj endpoint
// na admin.marysoll.com sa `credentials: "include"` — SameSite=Lax cookie se šalje
// jer su marysoll.com i admin.marysoll.com isti site (registrable domain).
//
// Cookie se NIKAD ne deli van host-a: CORS eksplicitno dozvoljava čitanje odgovora
// SAMO apex/www marketing origin-u (echo + Allow-Credentials), pa nijedan tenant
// subdomen (*.marysoll.com) ne može da pročita tuđu sesiju.

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

// Samo apex marketing origin (i www) sme da čita odgovor. NE wildcard, NE tenant subdomeni.
const ALLOWED_ORIGINS = new Set([
  `https://${BASE_DOMAIN}`,
  `https://www.${BASE_DOMAIN}`,
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  // Echo origin samo ako je na allowlisti — inače browser ne izlaže odgovor (fail closed).
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;

  if (!decoded) {
    return NextResponse.json({ loggedIn: false }, { headers });
  }

  return NextResponse.json(
    {
      loggedIn: true,
      name: decoded.name ?? "",
      email: decoded.email ?? "",
      isAdmin: decoded.isAdmin ?? false,
      isSuperAdmin: decoded.isSuperAdmin ?? false,
      tenantSlug: decoded.tenantSlug ?? null,
      tenantId: decoded.tenantId ?? null,
    },
    { headers },
  );
}
