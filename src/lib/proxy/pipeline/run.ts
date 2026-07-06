/**
 * executePipeline — redosled koraka je CEO proxy flow:
 *   system → detect-domain → public → auth → routing
 * Prvi korak koji vrati NextResponse završava pipeline (null = sledeći korak).
 * finalize na svaki odgovor primenjuje osvežen token cookie i, u debug režimu,
 * x-proxy-trace header sa koracima odluke.
 */
import type { NextResponse } from "next/server";
import { applyRefreshedCookie } from "../guards";
import type { ProxyContext } from "./context";
import { pass } from "./context";
import { systemRoutes } from "./system";
import { detectDomain } from "./detect-domain";
import { publicRoutes } from "./public";
import { authGate } from "./auth";
import { route } from "./routing";

export type PipelineStep = (
  ctx: ProxyContext,
) => Promise<NextResponse | null> | NextResponse | null;

const STEPS: PipelineStep[] = [
  systemRoutes,
  detectDomain,
  publicRoutes,
  authGate,
  route,
];

export async function executePipeline(
  ctx: ProxyContext,
): Promise<NextResponse> {
  for (const step of STEPS) {
    const response = await step(ctx);
    if (response) return finalize(ctx, response);
  }
  // Nijedan korak nije presudio (npr. nepoznat domainType) — propusti.
  return finalize(ctx, pass(ctx));
}

function finalize(ctx: ProxyContext, response: NextResponse): NextResponse {
  applyRefreshedCookie(response, ctx.auth);
  if (ctx.debug) {
    response.headers.set("x-proxy-trace", ctx.trace.join(" | "));
  }
  return response;
}
