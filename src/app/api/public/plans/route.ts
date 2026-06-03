import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Plan } from "@/models/Plan";

/**
 * GET /api/public/plans
 *
 * Javna lista aktivnih planova za prikaz (pricing / upgrade kartice u dashboardu).
 * Vraća samo prikazna polja — bez Paddle ID-jeva i internih podataka.
 * /api/plans je superadmin-only (proxy), pa tenant koristi ovaj endpoint.
 */
export async function GET() {
  await connectToDB();

  const plans = await Plan.find({ isActive: true })
    .select("name slug description priceMonthly priceYearly isHighlighted sortOrder")
    .sort({ sortOrder: 1 })
    .lean();

  return NextResponse.json(plans);
}
