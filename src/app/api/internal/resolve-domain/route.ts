/**
 * GET /api/internal/resolve-domain?domain=kikikiss.beauty
 *
 * Internal API — called only by middleware (proxy.ts).
 * Protected by INTERNAL_API_SECRET header.
 *
 * Returns: { slug: "kiki-kiss" } or 404
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";

export async function GET(req: NextRequest) {
  // Security check — only middleware can call this
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json(
      { error: "domain param required" },
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    const tenant = (await Tenant.findOne({
      customDomain: domain.toLowerCase(),
      status: "active",
    })
      .select("slug")
      .lean()) as Record<string, unknown> | null;

    if (!tenant) {
      return NextResponse.json({ slug: null }, { status: 404 });
    }

    return NextResponse.json({ slug: String(tenant.slug) });
  } catch (err) {
    console.error("GET /api/internal/resolve-domain:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
