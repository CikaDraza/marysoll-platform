/**
 * GET /api/superadmin/stats
 * Platform-wide statistics for the superadmin dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      paidTenants,
      newThisMonth,
      newThisWeek,
      totalUsers,
      planCounts,
    ] = await Promise.all([
      Tenant.countDocuments({}),
      Tenant.countDocuments({ status: "active" }),
      Tenant.countDocuments({ isTrialActive: true, trialEndsAt: { $gt: now } }),
      Tenant.countDocuments({ status: "suspended" }),
      Tenant.countDocuments({ paid: true }),
      Tenant.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Tenant.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      AuthUser.countDocuments({ platformRole: { $ne: "SUPER_ADMIN" } }),
      Tenant.aggregate([
        { $group: { _id: "$plan", count: { $sum: 1 } } },
      ]),
    ]);

    const planBreakdown: Record<string, number> = {};
    for (const p of planCounts) {
      planBreakdown[p._id as string] = p.count as number;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        paidTenants,
        freeTenants: totalTenants - paidTenants,
        newThisMonth,
        newThisWeek,
        totalUsers,
        planBreakdown,
        trialConversionRate:
          totalTenants > 0
            ? Math.round((paidTenants / totalTenants) * 100)
            : 0,
      },
    });
  } catch (err) {
    console.error("GET /api/superadmin/stats:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
