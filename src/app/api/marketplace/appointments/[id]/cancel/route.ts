/**
 * POST /api/marketplace/appointments/[id]/cancel
 * Body: { clientEmail: string }
 *
 * Cross-tenant cancellation endpoint (booking.marysoll.com boost app).
 * Protected by HMAC — the calling server passes the clientEmail it extracted
 * from the user's verified Bearer token, so no tenant-scoped JWT is needed.
 * Deli tok sa tenant rutom (clientFlows) — uklj. loyalty hook koji je ranije
 * ovde nedostajao (vaučer se nije oslobađao pri otkazivanju kroz boost app).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { cancelAppointmentAsClient } from "@/lib/appointments/clientFlows";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const bodyText = await req.clone().text();
  const verify = verifySignature(req, bodyText);
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { id } = await context.params;

  let clientEmail: string | undefined;
  try {
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.toLowerCase().trim() : undefined;
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  if (!clientEmail) {
    return NextResponse.json({ error: "clientEmail je obavezan." }, { status: 400 });
  }

  try {
    await connectToDB();

    const appointment = await Appointment.findOne({
      _id: id,
      clientEmail: { $regex: `^${clientEmail}$`, $options: "i" },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Termin nije pronađen." }, { status: 404 });
    }

    const result = await cancelAppointmentAsClient(appointment);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: result.message, appointment });
  } catch (error) {
    console.error("POST /api/marketplace/appointments/[id]/cancel error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
