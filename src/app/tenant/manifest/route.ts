/**
 * Tenant-specific web app manifest.
 *
 * Android reads this document when a client installs the PWA. Unlike the site
 * logo, `notificationLogo` is guaranteed to be a raster upload, so it is safe
 * for Android and iOS app icons. The proxy provides x-tenant-id on this
 * internal route.
 */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { usableRasterLogo } from "@/lib/branding/rasterLogo";

const PLATFORM_ICONS = [
  { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
  { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
];

function cloudinaryIcon(url: string, size: number): string | null {
  const marker = "/image/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const head = url.slice(0, index + marker.length);
  const tail = url.slice(index + marker.length);
  // Pretvori JPG/WebP upload u PNG i napravi tačne dimenzije koje manifest
  // oglašava. c_fill prati postojeću favicon transformaciju.
  return `${head}w_${size},h_${size},c_fill,f_png/${tail}`;
}

function manifestIcons(notificationLogo: string | null) {
  if (!usableRasterLogo(notificationLogo)) return PLATFORM_ICONS;

  const icon192 = cloudinaryIcon(notificationLogo, 192);
  const icon512 = cloudinaryIcon(notificationLogo, 512);
  if (icon192 && icon512) {
    return [
      { src: icon192, sizes: "192x192", type: "image/png" },
      { src: icon512, sizes: "512x512", type: "image/png" },
    ];
  }

  // Uploadovi trenutno idu na Cloudinary. Ovo ostavlja ispravno ponašanje i
  // za eventualni budući eksterni raster URL bez lažnog `sizes` podatka.
  return [{ src: notificationLogo }];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tenantId = req.headers.get("x-tenant-id") ?? "";
  let notificationLogo: string | null = null;

  if (Types.ObjectId.isValid(tenantId)) {
    try {
      await connectToDB();
      const profile = (await SalonProfile.findOne({ tenantId })
        .select("notificationLogo")
        .lean()) as { notificationLogo?: string } | null;
      notificationLogo = profile?.notificationLogo ?? null;
    } catch {
      // Neuspešan lookup ne sme blokirati instalaciju; koristi Marysoll ikonu.
    }
  }

  return NextResponse.json(
    {
      name: "Marysoll Bussines Growth System",
      short_name: "Marysoll",
      description: "Marysoll - Sa nama salon ti raste, fitnes centar, klinika, spa…",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#3b82f6",
      icons: manifestIcons(notificationLogo),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, must-revalidate",
      },
    },
  );
}
