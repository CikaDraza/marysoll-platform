import { NextResponse, NextRequest } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { TenantUser } from "@/models/TenantUser";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { Types } from "mongoose";
import "@/models/Appointment";
import "@/models/Service";
import {
  getAppointmentPotentialValue,
  getAppointmentRealizedValue,
} from "@/lib/appointments/pricingSnapshot";

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

interface IAppointment {
  _id?: string;
  clientProfileId?: string;
  clientName: string;
  clientEmail: string;
  services: IAppointmentServiceItem[];
  serviceName: string;
  date: string;
  time: string;
  status?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Prihod jednog termina = zbir stavki (cena × količina). */
/**
 * Vrednost termina za prihod — `null` kada cena NIJE poznata.
 *
 * `s.price * quantity || 0` je pretvarao svaki termin na upit u prihod od
 * nula dinara. Nula je poslovna činjenica („besplatno"), a nepoznata cena
 * nije — takvi termini se broje odvojeno i ne ulaze ni u jedan zbir.
 */
function appointmentRevenue(a: IAppointment): number | null {
  return a.status === "completed"
    ? getAppointmentRealizedValue(a)
    : getAppointmentPotentialValue(a);
}

interface IUser {
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

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    // ── Autorizacija ──────────────────────────────────────────────────────
    // Ruta je ranije radila `if (tenantId)` na obe provere. Bez tokena je
    // `tenantId` bio `null`, pa se PRESKAKAO i plan gate I tenant filter —
    // neautentifikovan poziv vraćao je statistiku SVIH salona na platformi.
    const token = getTokenFromRequest(req);
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = decoded.isSuperAdmin ?? false;
    if (isSuperAdmin) {
      // Superadmin sme preko svih salona — svaki takav pristup se beleži.
      console.error(
        JSON.stringify({
          event: "SUPERADMIN_UNSCOPED_STATISTICS_ACCESS",
          userId: decoded.id,
          path: req.url,
          timestamp: new Date().toISOString(),
        }),
      );
    } else if (!decoded.isAdmin) {
      // Statistika je poslovni podatak salona; klijent joj ne pristupa.
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (!decoded.tenantId) {
      return NextResponse.json(
        { error: "Forbidden: no tenant context" },
        { status: 403 },
      );
    }

    const tenantId = isSuperAdmin ? null : (decoded.tenantId ?? null);

    // Plan gate — statistics requires claudia+
    if (tenantId) {
      const denied = await requireFeature(tenantId, "statistics");
      if (denied) return denied;
    }

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
    /** Broj termina po usluzi kojima cena nije poznata. */
    const servicesWithoutPrice: Record<string, number> = {};

    appointments.forEach((a) => {
      a.services.forEach((s) => {
        const serviceDoc =
          typeof s.serviceId === "object" && s.serviceId
            ? (s.serviceId as IService)
            : null;

        const serviceName = serviceDoc?.name || a.serviceName || "Nepoznato";

        serviceDistribution[serviceName] =
          (serviceDistribution[serviceName] || 0) + 1;

          // Termin bez poznate cene ne doprinosi prihodu usluge, ali se broji.
        const value = appointmentRevenue(a);
        if (value == null) {
          servicesWithoutPrice[serviceName] =
            (servicesWithoutPrice[serviceName] || 0) + 1;
        } else {
          revenueByService[serviceName] =
            (revenueByService[serviceName] || 0) + value;
        }
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
    // 4. PRIHOD — potencijalni / ostvareni / neostvareni
    // -------------------------
    // Potencijalni = svi zakazani termini u mesecu (bez obzira na status).
    // Ostvareni    = samo oni koje je admin označio kao završene ("došla").
    // Neostvareni  = otkazani i odbijeni termini (prihod koji je propao).
    const totalRevenue = Object.values(revenueByService).reduce(
      (acc, val) => acc + val,
      0
    );

    let completedRevenue = 0;
    let cancelledRevenue = 0;
    let noShowRevenue = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    /** Termini koji ulaze u statistiku, ali kojima cena nije poznata. */
    let withoutPriceCount = 0;

    appointments.forEach((a) => {
      const revenue = appointmentRevenue(a);
      if (revenue == null) withoutPriceCount++;

      if (a.status === "completed") {
        completedRevenue += revenue ?? 0;
        completedCount++;
      } else if (
        a.status === "appointment_cancelled" ||
        a.status === "appointment_rejected"
      ) {
        cancelledRevenue += revenue ?? 0;
        cancelledCount++;
      } else if (a.status === "no_show") {
        noShowRevenue += revenue ?? 0;
      }
    });

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
    // "Aktivni" = različiti klijenti koji su zakazali u ovom mesecu.
    const clientsThisMonth = new Set(appointments.map((a) => a.clientEmail));
    const activeClients = clientsThisMonth.size;
    const inactiveClients = users.length - clientsThisMonth.size;

    // "Novi" = klijent čiji je PRVI termin ikad nastao u ovom mesecu.
    // Raniji račun je tražio prvi termin unutar već filtrirane (mesečne) liste,
    // pa je uslov uvek bio tačan i "novi" je bio jednak broju aktivnih.
    const firstEverByEmail = clientsThisMonth.size
      ? await Appointment.aggregate<{ _id: string; firstCreatedAt: Date }>([
          {
            $match: {
              ...(tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {}),
              clientEmail: { $in: [...clientsThisMonth] },
            },
          },
          { $group: { _id: "$clientEmail", firstCreatedAt: { $min: "$createdAt" } } },
        ])
      : [];

    const newClientEmails = firstEverByEmail
      .filter((c) => c.firstCreatedAt >= start && c.firstCreatedAt < end)
      .map((c) => c._id);
    const newClients = newClientEmails.length;
    // Ostatak aktivnih su povratni — već su zakazivali ranije.
    const returningClients = activeClients - newClients;

    // Nalozi registrovani u ovom mesecu (nezavisno od toga jesu li zakazali).
    const registeredThisMonth = users.filter((u) => {
      const created = new Date(u.createdAt ?? "");
      return created >= start && created < end;
    }).length;

    // -------------------------
    // 7. DETALJNA RASPODELA USLUGA
    // -------------------------
    const serviceBreakdown = Object.entries(serviceDistribution).map(
      ([name, count]) => {
        const withoutPrice = servicesWithoutPrice[name] ?? 0;
        const revenue = revenueByService[name];
        return {
          name,
          count,
          /** `null` = nijedan termin te usluge nema poznatu cenu. UI to
           *  prikazuje kao „Cena nije definisana", ne kao 0 RSD. */
          revenue: revenue == null && withoutPrice > 0 ? null : (revenue ?? 0),
          withoutPrice,
        };
      },
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
      revenue: {
        potential: totalRevenue,
        completed: completedRevenue,
        cancelled: cancelledRevenue,
        noShow: noShowRevenue,
        completedCount,
        cancelledCount,
        /** Termini koji ulaze u statistiku, ali kojima cena nije poznata.
         *  NE ulaze ni u potencijalni ni u ostvaren prihod. */
        withoutPriceCount,
      },
      avgTimeGap,

      clients: {
        total: users.length,
        active: activeClients,
        inactive: inactiveClients,
        new: newClients,
        returning: returningClients,
        registeredThisMonth,
      },
    });
  } catch (err) {
    console.error("STATISTICS ERROR:", err);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
