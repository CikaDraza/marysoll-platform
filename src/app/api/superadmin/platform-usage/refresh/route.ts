/**
 * POST /api/superadmin/platform-usage/refresh
 * Poziva Cloudinary Admin API + MongoDB admin komande, izračunava tenant procenu,
 * snima u PlatformUsageSnapshot i vraća svežu potrošnju. Pokreće se ručno
 * ("Osveži potrošnju") da bi se štedela Cloudinary kvota (free: 500 req/h).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { refreshPlatformUsage } from "@/lib/superadmin/platformUsage";
import { platformUsageResponseSchema } from "@/types/platform-usage";

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const usage = await refreshPlatformUsage();
    const response = platformUsageResponseSchema.parse({
      success: true,
      usage,
    });
    return NextResponse.json(response);
  } catch (err) {
    console.error("POST /api/superadmin/platform-usage/refresh:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
