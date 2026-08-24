/**
 * GET /api/internal/resolve-tenant?slug=mysalon
 *
 * Internal API — called only by middleware (proxy.ts).
 * Protected by INTERNAL_API_SECRET header.
 *
 * Returns: { id: string, slug: string, customDomain?: string } or 404
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug param required" }, { status: 400 });
  }

  try {
    await connectToDB();

    const tenant = await Tenant.findOne({
      slug: slug.toLowerCase().trim(),
      status: "active",
    })
      .select("_id slug customDomain customDomainVerified")
      .lean<{
        _id: import("mongoose").Types.ObjectId;
        slug: string;
        customDomain?: string | null;
        customDomainVerified?: boolean;
      }>();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: tenant._id.toString(),
      slug: tenant.slug,
      customDomain:
        tenant.customDomain && tenant.customDomainVerified
          ? tenant.customDomain
          : null,
    });
  } catch (err) {
    console.error("GET /api/internal/resolve-tenant:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
