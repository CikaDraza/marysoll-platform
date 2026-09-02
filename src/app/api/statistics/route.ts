import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { computeSalonStatistics, statisticsPeriod, type StatisticsAppointment } from "@/lib/statistics/engine";
import { Appointment } from "@/models/Appointment";
import { TenantUser } from "@/models/TenantUser";
import "@/models/Service";

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
});

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!decoded.isSuperAdmin && !decoded.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!decoded.isSuperAdmin && !decoded.tenantId) return NextResponse.json({ error: "Forbidden: no tenant context" }, { status: 403 });

    const parsedQuery = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Neispravan mesec ili godina", details: parsedQuery.error.flatten() }, { status: 400 });
    }

    const tenantId = decoded.isSuperAdmin ? null : decoded.tenantId!;
    if (tenantId) {
      const denied = await requireFeature(tenantId, "statistics");
      if (denied) return denied;
    } else {
      console.error(JSON.stringify({ event: "SUPERADMIN_UNSCOPED_STATISTICS_ACCESS", userId: decoded.id, path: request.url, timestamp: new Date().toISOString() }));
    }

    await connectToDB();
    const { month, year } = parsedQuery.data;
    const { start, end } = statisticsPeriod(month, year);
    const tenantFilter = tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {};
    const clientRoleFilter = { role: { $nin: ["OWNER", "ADMIN"] } };

    const [appointments, totalClients, registeredThisMonth] = await Promise.all([
      Appointment.find({ ...tenantFilter, createdAt: { $gte: start, $lt: end } })
        .select("clientProfileId clientName clientEmail services serviceName date time status createdAt pricingSnapshot totalPrice")
        .populate({ path: "services.serviceId", select: "name" })
        .lean(),
      TenantUser.countDocuments({ ...tenantFilter, ...clientRoleFilter }),
      TenantUser.countDocuments({ ...tenantFilter, ...clientRoleFilter, createdAt: { $gte: start, $lt: end } }),
    ]);

    const typedAppointments = appointments as unknown as StatisticsAppointment[];
    const activeEmails = [...new Set(typedAppointments.map((appointment) => appointment.clientEmail).filter(Boolean))];
    const firstEverByEmail = activeEmails.length
      ? await Appointment.aggregate<{ _id: string; firstCreatedAt: Date }>([
          { $match: { ...tenantFilter, clientEmail: { $in: activeEmails } } },
          { $group: { _id: "$clientEmail", firstCreatedAt: { $min: "$createdAt" } } },
        ])
      : [];

    return NextResponse.json(computeSalonStatistics({
      appointments: typedAppointments,
      month,
      year,
      totalClients,
      registeredThisMonth,
      firstEverByEmail: firstEverByEmail.map((entry) => ({ email: entry._id, firstCreatedAt: entry.firstCreatedAt })),
    }));
  } catch (error) {
    console.error("STATISTICS ERROR:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
