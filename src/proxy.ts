// src/proxy.ts
/**
 * proxy.ts — Platform Gateway (Next.js zahteva da middleware živi ovde).
 *
 * NE sadrži logiku: kreira ProxyContext i pušta ga kroz pipeline korake u
 * src/lib/proxy/pipeline/ — system → detect-domain → public → auth → routing.
 * Servisi iza koraka su platformski klijenti u src/lib/platform/
 * (tenant-client, identity-client) — proxy ne poznaje njihovu implementaciju;
 * danas su to interne rute + jose, sutra mogu biti engine servisi.
 *
 * Debug: x-proxy-debug: 1 (ili ?proxy-debug=1) → x-proxy-trace header
 * sa koracima odluke. Ponašanje čuva src/proxy.test.ts.
 *
 * Security boundary: tenantId (DB _id) — never slug alone.
 */
import type { NextRequest, NextResponse } from "next/server";
import { createContext } from "@/lib/proxy/pipeline/context";
import { executePipeline } from "@/lib/proxy/pipeline/run";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  return executePipeline(createContext(request));
}

export const config = {
  matcher: [
    // NOTE: favicon.ico i .ico NISU isključeni — proxy ih presreće da bi servirao
    // tenant-specifičan favicon (vidi pipeline/public.ts). Ostali statički fajlovi ostaju out.
    "/((?!_next/static|_next/image|assets/|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.gif|.*\\.svg|.*\\.mp4|.*\\.webm|.*\\.ogg|.*\\.mp3|service-worker\\.js).*)",
  ],
};
