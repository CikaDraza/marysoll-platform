/**
 * Proxy guardovi: čitaju token iz zahteva, autentifikuju kroz identity-client
 * (verify → refresh) i ishod pretvaraju u HTTP odgovor — JSON 401/403 za API,
 * redirect na login/unauthorized za stranice.
 *
 * Cross-tenant zaštita: tenant token MORA da pripada razrešenom tenantId-ju
 * (identityClient.validateTenantAccess) — superadmin/platform tokeni izuzeti.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { identityClient } from "@/lib/platform/identity-client";
import type { DecodedToken } from "@/lib/platform/identity-client";
import type { AuthOut } from "./types";
import { BASE_DOMAIN, IS_PROD, isPathBasedHost } from "./constants";

/**
 * Reads the access token from the request.
 * Priority: Authorization header → tenant-access-token → platform-access-token.
 */
function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  return (
    request.cookies.get("tenant-access-token")?.value ??
    request.cookies.get("platform-access-token")?.value ??
    null
  );
}

/**
 * verify → (po potrebi) refresh → verify. Ako je token osvežen, upisuje
 * refreshedCookie u `out` — pipeline finalize ga postavlja na odgovor.
 */
async function authenticate(
  request: NextRequest,
  out: AuthOut,
): Promise<DecodedToken | null> {
  const token = getToken(request);
  const decoded = token ? await identityClient.verifyToken(token) : null;
  if (decoded) return decoded;

  const refreshed = await identityClient.refreshAccessToken(request);
  const refreshedDecoded = refreshed
    ? await identityClient.verifyToken(refreshed)
    : null;
  if (!refreshedDecoded || !refreshed) return null;

  const cookieName =
    refreshedDecoded.type === "tenant"
      ? "tenant-access-token"
      : "platform-access-token";
  out.refreshedCookie = { name: cookieName, value: refreshed };
  return refreshedDecoded;
}

/** Applies a refreshed token cookie to a response. */
export function applyRefreshedCookie(
  response: NextResponse,
  out: AuthOut,
): void {
  if (!out.refreshedCookie) return;
  response.cookies.set(out.refreshedCookie.name, out.refreshedCookie.value, {
    httpOnly: false,
    sameSite: "lax",
    secure: IS_PROD,
    path: "/",
  });
}

export async function guardApi(
  request: NextRequest,
  resolvedTenantId: string | null,
  needAdmin = false,
  needSuperAdmin = false,
  out: AuthOut = {},
): Promise<NextResponse | null> {
  const decoded = await authenticate(request, out);
  if (!decoded)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!identityClient.validateTenantAccess(decoded, resolvedTenantId))
    return NextResponse.json(
      { error: "Unauthorized: token does not belong to this tenant" },
      { status: 401 },
    );

  if (needSuperAdmin && !decoded.isSuperAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (needAdmin && !decoded.isAdmin && !decoded.isSuperAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/**
 * Gde poslati neprijavljenog korisnika. Na path-based hostovima (dev,
 * *.vercel.app preview, staging/qa apex) login je na ISTOM hostu — bez ovoga
 * bi staging redirektovao na produkcijski `https://marysoll.com/login`.
 */
function loginRedirectUrl(request: NextRequest): URL {
  const host = request.headers.get("host") ?? request.nextUrl.hostname;
  if (isPathBasedHost(host)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return url;
  }
  return new URL(`https://${BASE_DOMAIN}/login`);
}

export async function guardPage(
  request: NextRequest,
  resolvedTenantId: string | null,
  needAdmin = false,
  needSuperAdmin = false,
  out: AuthOut = {},
): Promise<NextResponse | null> {
  const loginUrl = loginRedirectUrl(request);
  const unauthorizedUrl = new URL("/unauthorized", request.url);

  const decoded = await authenticate(request, out);
  if (!decoded) return NextResponse.redirect(loginUrl);

  if (!identityClient.validateTenantAccess(decoded, resolvedTenantId))
    return NextResponse.redirect(loginUrl);

  if (needSuperAdmin && !decoded.isSuperAdmin)
    return NextResponse.redirect(unauthorizedUrl);
  if (needAdmin && !decoded.isAdmin && !decoded.isSuperAdmin)
    return NextResponse.redirect(unauthorizedUrl);
  return null;
}
