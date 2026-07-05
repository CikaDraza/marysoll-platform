import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { rescheduleAppointmentAsClient } from "@/lib/appointments/clientFlows";
import type { IAppointmentService } from "@/types";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await connectToDB();

  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const appointment = await Appointment.findOne({
    _id: id,
    tenantId: decoded.tenantId,
    clientProfileId: decoded.tenantUserId,
  });

  if (!appointment) {
    return NextResponse.json({ error: "Termin nije pronađen." }, { status: 404 });
  }

  const data = await req.json();
  const services = Array.isArray(data.services)
    ? (data.services as IAppointmentService[])
    : [];

  if (!services[0]?.serviceId || !data.date || !data.time) {
    return NextResponse.json(
      { error: "Datum, vreme i usluga su obavezni." },
      { status: 400 },
    );
  }

  const result = await rescheduleAppointmentAsClient(
    appointment,
    {
      date: data.date,
      time: data.time,
      services,
      serviceName: data.serviceName,
      note: data.note,
      duration: data.duration,
    },
    // Istorijska poruka ove rute (klijentski panel je prikazuje direktno)
    { expiredMessage: "Vreme za otkazivanje termina je isteklo." },
  );

  if (!result.ok) {
    const status = result.kind === "service_not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ message: "Termin je ažuriran.", appointment });
}
