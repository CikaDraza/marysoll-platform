/**
 * PUT /api/marketplace/appointments/[id]/update
 * Body: { clientEmail: string, date: string, time: string, services?: [...], note?: string, duration?: number, serviceName?: string }
 *
 * Cross-tenant rescheduling endpoint (booking.marysoll.com boost app).
 * Protected by HMAC — the calling server passes the clientEmail it extracted
 * from the user's verified Bearer token, so no tenant-scoped JWT is needed.
 * Deli tok sa tenant rutom (clientFlows) — uklj. proveru preklapanja po
 * trajanju i manualSlots proveru koje su ranije ovde nedostajale.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { rescheduleAppointmentAsClient } from "@/lib/appointments/clientFlows";
import { requireCapability } from "@/lib/platform/capabilities-server";
import type { IAppointmentService } from "@/types";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const bodyText = await req.clone().text();
  const verify = verifySignature(req, bodyText);
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { id } = await context.params;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  const clientEmail =
    typeof data.clientEmail === "string" ? data.clientEmail.toLowerCase().trim() : undefined;

  if (!clientEmail) {
    return NextResponse.json({ error: "clientEmail je obavezan." }, { status: 400 });
  }

  const services = Array.isArray(data.services)
    ? (data.services as IAppointmentService[])
    : [];

  if (!services[0]?.serviceId || !data.date || !data.time) {
    return NextResponse.json(
      { error: "Datum, vreme i usluga su obavezni." },
      { status: 400 },
    );
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
    const denied = await requireCapability(String(appointment.tenantId), "booking.services");
    if (denied) return denied;

    const result = await rescheduleAppointmentAsClient(appointment, {
      date: data.date as string,
      time: data.time as string,
      services,
      serviceName: typeof data.serviceName === "string" ? data.serviceName : undefined,
      note: typeof data.note === "string" ? data.note : undefined,
      duration: typeof data.duration === "number" ? data.duration : undefined,
    });

    if (!result.ok) {
      // Boost app očekuje 409 za zauzet/nedostupan slot (istorijski ugovor)
      const status =
        result.kind === "service_not_found"
          ? 404
          : result.kind === "conflict" || result.kind === "unavailable"
            ? 409
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ message: "Termin je ažuriran.", appointment });
  } catch (error) {
    console.error("PUT /api/marketplace/appointments/[id]/update error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
