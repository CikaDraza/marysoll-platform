/**
 * Korak 4 — auth: guardovi za platformske hostove (superadmin/admin).
 *
 * NOTE: Authentication is intentionally lazy.
 * Only protected routes invoke JWT verification.
 * Public marketing and tenant pages never pay this cost.
 * (Klijentske zaštićene API rute guarduje routing korak — isti guardApi.)
 */
import type { NextResponse } from "next/server";
import {
  ADMIN_PROTECTED_API_ROUTES,
  SUPERADMIN_API_ROUTES,
} from "../constants";
import { guardApi, guardPage } from "../guards";
import type { ProxyContext } from "./context";
import { pass, trace } from "./context";

export async function authGate(ctx: ProxyContext): Promise<NextResponse | null> {
  const { request, pathname, domainType } = ctx;

  // SuperAdmin — sve stranice + superadmin API rute (i sa admin hosta)
  if (
    domainType === "superadmin" ||
    SUPERADMIN_API_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    if (pathname.startsWith("/auth/callback")) {
      trace(ctx, "auth: /auth/callback -> pass");
      return pass(ctx);
    }
    const fail = pathname.startsWith("/api/")
      ? await guardApi(request, null, false, true, ctx.auth)
      : await guardPage(request, null, false, true, ctx.auth);
    if (fail) {
      trace(ctx, "auth: superadmin guard FAILED");
      return fail;
    }
    trace(ctx, "auth: superadmin ok -> pass");
    return pass(ctx);
  }

  // Admin — guard SAMO za zaštićene API rute; stranice štiti klijentski layout
  if (domainType === "admin") {
    if (
      pathname.startsWith("/api/") &&
      ADMIN_PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))
    ) {
      const fail = await guardApi(request, ctx.tenant.id, true, false, ctx.auth);
      if (fail) {
        trace(ctx, "auth: admin api guard FAILED");
        return fail;
      }
      trace(ctx, "auth: admin api ok -> pass");
      return pass(ctx);
    }
    trace(ctx, "auth: skipped (admin page/otvorena ruta) -> pass");
    return pass(ctx);
  }

  return null;
}
