// POST /api/marketplace/slots/generate
// Triggers slot generation for one salon or all salons (rolling window).
// Called by Vercel Cron or manually. Requires CRON_SECRET header.
import { NextRequest, NextResponse } from "next/server";
import {
  generateSlotsForSalon,
  rollSlotsForward,
} from "@/lib/slots/generateSlotsForSalon";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const salonId = typeof body?.salonId === "string" ? body.salonId : null;
    const daysAhead = typeof body?.daysAhead === "number" ? body.daysAhead : 14;

    if (salonId) {
      const inserted = await generateSlotsForSalon(salonId, daysAhead);
      return NextResponse.json({ ok: true, inserted });
    }

    await rollSlotsForward(daysAhead);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/marketplace/slots/generate]", err);
    return NextResponse.json(
      { error: "Greška pri generisanju termina" },
      { status: 500 },
    );
  }
}
