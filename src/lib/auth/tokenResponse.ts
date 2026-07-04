import "server-only";

/**
 * Deljeni graditelji login odgovora sa access/refresh cookie-jima.
 * Kritično da NE žive u dve kopije po login rutama — razilaženje cookie
 * atributa (domain/httpOnly/secure) tiho lomi prijavu na (sub)domenima.
 *
 *   platform-*  cookie: domain .marysoll.com  (SUPER_ADMIN, više subdomena)
 *   tenant-*    cookie: domain undefined       (izolovano po subdomenu)
 */
import { NextResponse } from "next/server";

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 dana

interface BaseUser {
  id: string;
  email: string;
  name: string;
  globalRole: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function buildPlatformTokenResponse(
  accessToken: string,
  refreshToken: string,
  user: BaseUser,
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

  response.cookies.set("platform-refresh-token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    domain: isProd ? `.${baseDomain}` : undefined,
  });

  response.cookies.set("platform-access-token", accessToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    domain: isProd ? `.${baseDomain}` : undefined,
  });

  return response;
}

export function buildTenantTokenResponse(
  accessToken: string,
  refreshToken: string,
  user: BaseUser & { tenantId: string; tenantUserId: string },
) {
  const isProd = process.env.NODE_ENV === "production";

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

  // domain: undefined → cookie je izolovan na trenutni (sub)domen
  // (sprečava cross-tenant curenje tokena).
  response.cookies.set("tenant-refresh-token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    domain: undefined,
  });

  response.cookies.set("tenant-access-token", accessToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    domain: undefined,
  });

  return response;
}
