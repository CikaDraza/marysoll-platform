/**
 * ProxyContext — jedan objekat koji putuje kroz sve pipeline korake,
 * umesto gomile parametara. Koraci ga pune (domainType, tenant, headeri)
 * i čitaju; prvi korak koji vrati NextResponse završava pipeline.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AuthOut, DomainType } from "../types";

export interface ProxyContext {
  request: NextRequest;
  /** Iz "host" HEADERA (ne iz URL-a) — kao na Vercel runtime-u. */
  hostname: string;
  pathname: string;
  /** Postavlja detect-domain korak (inicijalno "marketing" kao neutralno). */
  domainType: DomainType;
  tenant: {
    slug: string | null;
    id: string | null;
    customDomain: string | null;
  };
  /** Slug je došao iz URL putanje (localhost dev / vercel preview), ne iz hosta. */
  isPathBasedHost: boolean;
  /** Headeri koje aplikacija čita (x-domain-type, x-tenant-*…) — puni detect-domain. */
  requestHeaders: Headers;
  /** Guardovi upisuju osvežen token; pipeline finalize ga postavlja na odgovor. */
  auth: AuthOut;
  /** Debug trace: x-proxy-debug: 1 ili ?proxy-debug=1 → x-proxy-trace header. */
  debug: boolean;
  trace: string[];
}

export function createContext(request: NextRequest): ProxyContext {
  const debugHeader = request.headers.get("x-proxy-debug");
  return {
    request,
    hostname: request.headers.get("host") ?? "",
    pathname: request.nextUrl.pathname,
    domainType: "marketing",
    tenant: { slug: null, id: null, customDomain: null },
    isPathBasedHost: false,
    requestHeaders: new Headers(request.headers),
    auth: {},
    debug:
      debugHeader === "1" ||
      debugHeader === "true" ||
      request.nextUrl.searchParams.get("proxy-debug") === "1",
    trace: [],
  };
}

/** No-op bez debug flaga — produkcija ne plaća trošak trace-a. */
export function trace(ctx: ProxyContext, message: string): void {
  if (ctx.debug) ctx.trace.push(message);
}

/** Propušta zahtev dalje sa injektovanim x-* headerima. */
export function pass(ctx: ProxyContext): NextResponse {
  return NextResponse.next({ request: { headers: ctx.requestHeaders } });
}
