/**
 * PATCH /api/superadmin/tenants/[tenantId]/plan
 *
 * SuperAdmin: change tenant plan.
 * Body: { plan: "maria"|"claudia"|"kiki"|"enterprise", expiresAt?: ISO date string }
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

type PlanSlug = "maria" | "claudia" | "kiki" | "enterprise";
type Params = { params: Promise<{ tenantId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await params;

  try {
    await connectToDB();

    const { plan, expiresAt } = (await req.json()) as {
      plan: PlanSlug;
      expiresAt?: string;
    };

    const validPlans: PlanSlug[] = ["maria", "claudia", "kiki", "enterprise"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Neispravan plan: ${plan}` },
        { status: 400 },
      );
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 404 },
      );
    }

    tenant.plan = plan;
    tenant.planExpiresAt = expiresAt ? new Date(expiresAt) : null;
    if (plan !== "maria") {
      tenant.paid = true;
      tenant.status = "active";
      tenant.verified = true;
    }

    await tenant.save();

    return NextResponse.json({
      success: true,
      message: `Plan promenjen na: ${plan}.`,
      plan: tenant.plan,
      planExpiresAt: tenant.planExpiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("PATCH /api/superadmin/tenants/[tenantId]/plan:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
