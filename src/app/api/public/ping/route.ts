import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/public/ping — mikro endpoint za mrežnu dijagnostiku.
 * Javan na SVIM hostovima (proxy propušta /api/public/* pre domain grana),
 * pa /dijagnostika stranica sa marysoll.com može cross-origin da proba
 * admin/superadmin/wildcard hostove. CORS * je zato obavezan.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { ok: true, host: req.headers.get("host"), ts: Date.now() },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    },
  );
}
