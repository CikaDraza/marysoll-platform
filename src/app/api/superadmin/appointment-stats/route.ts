// GET /api/superadmin/appointment-stats?month=5&year=2026
// Returns the per-salon monthly profile (appointments, staff, usage growth).
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { getSalonMonthlyStats } from "@/lib/superadmin/salonMonthlyStats";
import {
  appointmentStatsQuerySchema,
  appointmentStatsResponseSchema,
} from "@/types/superadmin-statistics";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const parsedQuery = appointmentStatsQuerySchema.safeParse({
    month: searchParams.get("month") ?? now.getMonth() + 1,
    year: searchParams.get("year") ?? now.getFullYear(),
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Nevažeći mesec ili godina" },
      { status: 400 },
    );
  }
  const { month, year } = parsedQuery.data;

  try {
    const stats = await getSalonMonthlyStats({ month, year });
    return NextResponse.json(
      appointmentStatsResponseSchema.parse({ stats, month, year }),
    );
  } catch (err) {
    console.error("[GET /api/superadmin/appointment-stats]", err);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
