import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import {
  captureResourceQuotaCalibration,
  ResourceQuotaCalibrationError,
} from "@/lib/superadmin/resourceQuotaCalibration";
import { readPlatformUsage } from "@/lib/superadmin/platformUsage";
import { platformUsageResponseSchema } from "@/types/platform-usage";

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await captureResourceQuotaCalibration(auth.decoded.id);
    const usage = await readPlatformUsage();
    const response = platformUsageResponseSchema.parse({
      success: true,
      usage,
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ResourceQuotaCalibrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("POST /api/superadmin/platform-usage/calibrate:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
