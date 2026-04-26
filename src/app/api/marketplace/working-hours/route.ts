// GET /api/marketplace/working-hours?salonId=
// Marketplace — working hours for a salon (no admin auth)
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";

export async function GET(req: NextRequest) {
  const verify = verifySignature(req, "");
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const salonId = searchParams.get("salonId");
  if (!salonId) {
    return NextResponse.json({ error: "salonId je obavezan" }, { status: 400 });
  }

  try {
    await connectToDB();

    const salon = await SalonProfile.findById(salonId).select("workingHours").lean();
    if (!salon) {
      return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
    }

    return NextResponse.json(
      (salon as Record<string, unknown>).workingHours ?? {},
    );
  } catch (err) {
    console.error("[GET /api/marketplace/working-hours]", err);
    return NextResponse.json({ error: "Greška pri učitavanju radnog vremena" }, { status: 500 });
  }
}
