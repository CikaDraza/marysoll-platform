// GET /api/superadmin/appointment-stats?month=5&year=2026
// Returns per-salon appointment counts for the given month.
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { Appointment } from "@/models/Appointment";
import { Tenant } from "@/models/Tenant";

export interface SalonMonthStats {
  tenantId: string;
  salonName: string;
  slug: string;
  total: number;
  nova: number;           // appointment_approved
  cekaNaOdobrenje: number; // pending
  zavrsena: number;       // completed
  otkazana: number;       // appointment_cancelled
  nijeSePojavilo: number; // no_show
}

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
    return NextResponse.json({ error: "Nevažeći mesec ili godina" }, { status: 400 });
  }

  const monthStr = String(month).padStart(2, "0");
  const datePrefix = `${year}-${monthStr}`;

  try {
    await connectToDB();

    // Aggregate appointment counts per tenant per status
    const agg = await Appointment.aggregate([
      { $match: { date: { $regex: `^${datePrefix}` } } },
      {
        $group: {
          _id: "$tenantId",
          total: { $sum: 1 },
          nova: {
            $sum: { $cond: [{ $eq: ["$status", "appointment_approved"] }, 1, 0] },
          },
          cekaNaOdobrenje: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          zavrsena: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          otkazana: {
            $sum: { $cond: [{ $eq: ["$status", "appointment_cancelled"] }, 1, 0] },
          },
          nijeSePojavilo: {
            $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    if (agg.length === 0) {
      return NextResponse.json({ stats: [], month, year });
    }

    // Fetch tenant names for matched tenantIds
    const tenantIds = agg.map((a) => new Types.ObjectId(a._id as string));
    const tenants = await Tenant.find({ _id: { $in: tenantIds } })
      .select("_id name slug")
      .lean() as unknown as Array<{ _id: Types.ObjectId; name: string; slug: string }>;

    const tenantMap = new Map(tenants.map((t) => [t._id.toString(), t]));

    const stats: SalonMonthStats[] = agg.map((a) => {
      const tid = String(a._id);
      const tenant = tenantMap.get(tid);
      return {
        tenantId: tid,
        salonName: tenant?.name ?? "Nepoznat salon",
        slug: tenant?.slug ?? "",
        total: a.total,
        nova: a.nova,
        cekaNaOdobrenje: a.cekaNaOdobrenje,
        zavrsena: a.zavrsena,
        otkazana: a.otkazana,
        nijeSePojavilo: a.nijeSePojavilo,
      };
    });

    return NextResponse.json({ stats, month, year });
  } catch (err) {
    console.error("[GET /api/superadmin/appointment-stats]", err);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
