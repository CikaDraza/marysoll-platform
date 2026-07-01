/**
 * app/tenant/favicon/route.ts — Tenant-aware favicon resolver.
 *
 * Never hit directly by browsers. proxy.ts rewrites `GET /favicon.ico` on a
 * client (tenant) domain to this route, carrying the proxy-injected
 * `x-tenant-id` header. We resolve the tenant's SITE logo and 307-redirect the
 * browser to it. Without a logo we fall back to the static platform favicon.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Types } from "mongoose";

const PLATFORM_FAVICON = "/marysoll_elegant_logo.ico";

/**
 * For Cloudinary URLs, insert a square favicon-sized transformation so the tab
 * icon is crisp regardless of the source logo's aspect ratio. Non-Cloudinary
 * URLs are returned unchanged (browsers downscale them fine).
 */
function toFaviconUrl(logo: string): string {
  const marker = "/image/upload/";
  const i = logo.indexOf(marker);
  if (i === -1) return logo;
  const head = logo.slice(0, i + marker.length);
  const tail = logo.slice(i + marker.length);
  return `${head}w_64,h_64,c_fill/${tail}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tenantId = req.headers.get("x-tenant-id") ?? "";

  let logo: string | null = null;
  if (tenantId && Types.ObjectId.isValid(tenantId)) {
    try {
      await connectToDB();
      const profile = (await SalonProfile.findOne({ tenantId })
        .select("logo")
        .lean()) as { logo?: string } | null;
      logo = profile?.logo || null;
    } catch {
      /* fall through to platform favicon */
    }
  }

  const target = logo
    ? toFaviconUrl(logo)
    : new URL(PLATFORM_FAVICON, req.nextUrl.origin).toString();

  const res = NextResponse.redirect(target, 307);
  // Kratko keširanje: favicon se ne menja često, a smanjuje DB pozive po tabu.
  res.headers.set("Cache-Control", "public, max-age=3600, must-revalidate");
  return res;
}
