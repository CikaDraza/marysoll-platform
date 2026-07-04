import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { cancelAppointmentAsClient } from "@/lib/appointments/clientFlows";

export async function POST(
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

  const result = await cancelAppointmentAsClient(appointment);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ message: result.message, appointment });
}
