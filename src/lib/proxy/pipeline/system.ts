/**
 * Korak 1 — system: infrastrukturne rute koje NE prolaze kroz ostatak
 * pipeline-a: Vercel cron bypass i /api/internal/* (samo uz internal secret).
 */
import { NextResponse } from "next/server";
import type { ProxyContext } from "./context";
import { trace } from "./context";

export function systemRoutes(ctx: ProxyContext): NextResponse | null {
  const { request, pathname } = ctx;

  // Vercel Cron bypass
  if (
    pathname === "/api/newsletter/campaigns/scheduler" &&
    request.headers.get("x-vercel-cron")
  ) {
    trace(ctx, "system: vercel cron -> pass");
    return NextResponse.next();
  }

  // Internal API — dostupno samo server-to-server pozivima sa secretom
  if (pathname.startsWith("/api/internal/")) {
    const secret = request.headers.get("x-internal-secret");
    if (secret !== process.env.INTERNAL_API_SECRET) {
      trace(ctx, "system: internal api bad secret -> 403");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    trace(ctx, "system: internal api secret ok -> pass");
    return NextResponse.next();
  }

  return null;
}
