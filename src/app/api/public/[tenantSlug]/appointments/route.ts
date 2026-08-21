/**
 * GET /api/public/[tenantSlug]/appointments
 *
 * Public — no auth required.
 * Returns approved/confirmed appointments for the public calendar.
 * Only exposes date, time, duration, serviceName — no client PII.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Appointment } from "@/models/Appointment";
import { requireCapability } from "@/lib/platform/capabilities-server";

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;
  try {
    await connectToDB();

    const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      return NextResponse.json({ success: false, error: "Salon nije pronađen" }, { status: 404 });
    }
    const denied = await requireCapability(
      String((tenant as Record<string, unknown>)._id),
      "booking.services",
    );
    if (denied) return NextResponse.json([]);

    const appointments = await Appointment.find({
      tenantId: (tenant as Record<string, unknown>)._id,
      status: { $in: ["appointment_approved", "pending"] },
    })
      .select("date time duration serviceName services status")
      .lean();

    // Serialize — only plain data, no PII
    const serialized = appointments.map((a) => {
      const appt = a as Record<string, unknown>;
      return {
        _id: String(appt._id ?? ""),
        date: String(appt.date ?? ""),
        time: String(appt.time ?? ""),
        duration: Number(appt.duration ?? 60),
        serviceName: String(appt.serviceName ?? ""),
        status: String(appt.status ?? "pending"),
        services: Array.isArray(appt.services)
          ? appt.services.map((s: unknown) => {
              const sv = s as Record<string, unknown>;
              return {
                serviceId: String(sv.serviceId ?? ""),
                serviceName: String(sv.serviceName ?? ""),
                duration: Number(sv.duration ?? 0),
                price: Number(sv.price ?? 0),
              };
            })
          : [],
      };
    });

    return NextResponse.json(serialized);
  } catch (err) {
    console.error("GET /api/public/[tenantSlug]/appointments:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
