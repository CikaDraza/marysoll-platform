import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { TenantUser } from "@/models/TenantUser";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { Types } from "mongoose";
import "@/models/Appointment";
import "@/models/Service";

// ---------------------------
// TypeScript Interfaces
// ---------------------------
export interface IService {
  _id?: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category?: string;
  items?: string[];
  subscription?: {
    enabled: boolean;
    priceMonthly: number | null;
    startDate: string | null;
    endDate: string | null;
  };
}

export interface IAppointmentServiceItem {
  serviceId: IService | string; // Posle populacije bice IService
  quantity: number;
  price: number;
}

export interface IAppointment {
  _id?: string;
  clientProfileId?: string;
  clientName: string;
  clientEmail: string;
  services: IAppointmentServiceItem[];
  serviceName: string;
  date: string;
  time: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------
//  GET /api/statistics?month=11&year=2025
// -----------------------------------------------------------

export async function GET(req: Request) {
  try {
    await connectToDB();

    // Extract tenant context from token
    const token = getTokenFromRequest(req);
    const decoded = token ? verifyToken(token) : null;
    const tenantId = decoded?.tenantId ?? null;

    const { searchParams } = new URL(req.url);

    const month = searchParams.get("month"); // 1–12
    const year = searchParams.get("year"); // 2025…

    if (!month || !year) {
      return NextResponse.json(
        { error: "month i year su obavezni parametri" },
        { status: 400 }
      );
    }

    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);

    // -------------------------
    // Fetch data
    // -------------------------
    const appointmentFilter: Record<string, unknown> = {
      createdAt: { $gte: start, $lt: end },
    };
    if (tenantId) {
      appointmentFilter.tenantId = new Types.ObjectId(tenantId);
    }

    const appointments = (await Appointment.find(appointmentFilter)
      .populate("clientProfileId")
      .populate("services.serviceId")) as unknown as IAppointment[];

    // TenantUser list scoped to tenant for client stats
    const userFilter = tenantId
      ? { tenantId: new Types.ObjectId(tenantId), role: { $nin: ["OWNER", "ADMIN"] } }
      : { role: { $nin: ["OWNER", "ADMIN"] } };
    const users = (await TenantUser.find(userFilter).select("_id name email createdAt").lean()) as unknown as IUser[];

    // -------------------------
    // 1. DISTRIBUCIJA USLUGA
    // -------------------------
    const serviceDistribution: Record<string, number> = {};
    const revenueByService: Record<string, number> = {};

    appointments.forEach((a) => {
      a.services.forEach((s) => {
        const serviceDoc =
          typeof s.serviceId === "object" && s.serviceId
            ? (s.serviceId as IService)
            : null;

        const serviceName = serviceDoc?.name || a.serviceName || "Nepoznato";

        serviceDistribution[serviceName] =
          (serviceDistribution[serviceName] || 0) + 1;

        revenueByService[serviceName] =
          (revenueByService[serviceName] || 0) + (s.price * s.quantity || 0);
      });
    });

    // -------------------------
    // 2. TOP 3 KLIJENTA
    // -------------------------
    const clientCounts: Record<string, number> = {};

    appointments.forEach((a) => {
      clientCounts[a.clientEmail] = (clientCounts[a.clientEmail] || 0) + 1;
    });

    const topClients = Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([email, count]) => ({ email, count }));

    // -------------------------
    // 3. TOP USLUGE
    // -------------------------
    const topServices = Object.entries(serviceDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }));

    // -------------------------
    // 4. UKUPAN PRIHOD
    // -------------------------
    const totalRevenue = Object.values(revenueByService).reduce(
      (acc, val) => acc + val,
      0
    );

    // -------------------------
    // 5. PROSEČAN RAZMAK TERMINA
    // -------------------------
    const sorted = [...appointments].sort(
      (a, b) =>
        new Date(`${a.date} ${a.time}`).getTime() -
        new Date(`${b.date} ${b.time}`).getTime()
    );

    let totalDiff = 0;
    let count = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(`${sorted[i - 1].date} ${sorted[i - 1].time}`);
      const curr = new Date(`${sorted[i].date} ${sorted[i].time}`);

      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60);

      if (diff > 0 && diff < 480) {
        totalDiff += diff;
        count++;
      }
    }

    const avgTimeGap = count > 0 ? Math.round(totalDiff / count) : 0;

    // -------------------------
    // 6. STATUS KLIJENATA
    // -------------------------
    const clientsThisMonth = new Set(appointments.map((a) => a.clientEmail));

    const newClients = users.filter((user) => {
      const firstA = appointments.find((a) => a.clientEmail === user.email);
      if (!firstA) return false;

      const created = new Date(firstA.createdAt ?? "");
      return (
        created.getMonth() + 1 === Number(month) &&
        created.getFullYear() === Number(year)
      );
    });

    const activeClients = clientsThisMonth.size;
    const inactiveClients = users.length - clientsThisMonth.size;

    // -------------------------
    // 7. DETALJNA RASPODELA USLUGA
    // -------------------------
    const serviceBreakdown = Object.entries(serviceDistribution).map(
      ([name, count]) => ({
        name,
        count,
        revenue: revenueByService[name] || 0,
      })
    );

    // -------------------------
    // RESPONSE
    // -------------------------
    return NextResponse.json({
      month,
      year,

      pieChart: serviceDistribution,
      revenueByService,
      serviceBreakdown,

      topClients,
      topServices,

      totalAppointments: appointments.length,
      totalRevenue,
      avgTimeGap,

      clients: {
        total: users.length,
        active: activeClients,
        inactive: inactiveClients,
        new: newClients.length,
      },
    });
  } catch (err) {
    console.error("STATISTICS ERROR:", err);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
