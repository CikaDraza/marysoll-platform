/**
 * GET /api/superadmin/platform-usage
 * Vraća keširanu potrošnju platforme (MongoDB + Cloudinary + tenant procena).
 * Čita SAMO snapshot — bez spoljnih poziva na svaki render.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { readPlatformUsage } from "@/lib/superadmin/platformUsage";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const usage = await readPlatformUsage();
    return NextResponse.json({ success: true, usage });
  } catch (err) {
    console.error("GET /api/superadmin/platform-usage:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
