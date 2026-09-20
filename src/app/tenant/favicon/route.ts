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
import { PLATFORM_FAVICON, faviconTransformUrl, monogramSvg, resolveTenantFavicon } from "@/lib/branding/favicon";

function requestedSize(value: string | null): number {
  const size = Number(value);
  return [16, 32, 48, 180, 192, 512].includes(size) ? size : 32;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tenantId = req.headers.get("x-tenant-id") ?? "";

  let profile: Record<string, unknown> | null = null;
  if (tenantId && Types.ObjectId.isValid(tenantId)) {
    try {
      await connectToDB();
      profile = (await SalonProfile.findOne({ tenantId })
        .select("name logo branding favicon")
        .lean()) as Record<string, unknown> | null;
    } catch {
      /* fall through to platform favicon */
    }
  }

  const resolved = resolveTenantFavicon(profile);
  const cacheControl = req.nextUrl.searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=60, must-revalidate";
  if (resolved.kind === "monogram") {
    return new NextResponse(monogramSvg(resolved), { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": cacheControl } });
  }
  const target = resolved.kind === "platform"
    ? new URL(PLATFORM_FAVICON, req.nextUrl.origin).toString()
    : faviconTransformUrl(resolved.source, requestedSize(req.nextUrl.searchParams.get("size")));

  const res = NextResponse.redirect(target, 307);
  res.headers.set("Cache-Control", cacheControl);
  return res;
}
