// GET /api/marketplace/availability?salonId=
// Marketplace — availability config for a salon (no admin auth).
// Vraća SVE što booking app slot-engine-u treba da bira režim:
//   { availabilityMode, workingHours, manualSlots }
// (Postojeći /marketplace/working-hours ostaje netaknut zbog starog ugovora.)
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
import { pruneAndValidateManualSlots } from "@/helpers/manualSlots";

export async function GET(req: NextRequest) {
  const verify = verifySignature(req, "");
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  const salonId = req.nextUrl.searchParams.get("salonId");
  if (!salonId) {
    return NextResponse.json({ error: "salonId je obavezan" }, { status: 400 });
  }

  try {
    await connectToDB();

    const salon = await SalonProfile.findById(salonId)
      .select("availabilityMode workingHours manualSlots")
      .lean();
    if (!salon) {
      return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
    }

    const s = salon as Record<string, unknown>;
    const availabilityMode =
      s.availabilityMode === "manualSlots" ? "manualSlots" : "workingHours";

    return NextResponse.json({
      availabilityMode,
      workingHours: s.workingHours ?? {},
      // Odseca prošle datume + validira ("HH:mm", trajanje, duplikati). U režimu
      // radnog vremena je manualSlots ionako nebitan → vraćamo prazno.
      manualSlots:
        availabilityMode === "manualSlots"
          ? pruneAndValidateManualSlots(s.manualSlots)
          : {},
    });
  } catch (err) {
    console.error("[GET /api/marketplace/availability]", err);
    return NextResponse.json(
      { error: "Greška pri učitavanju dostupnosti" },
      { status: 500 },
    );
  }
}
