/**
 * PATCH /api/superadmin/tenants/[tenantId]/plan
 *
 * SuperAdmin: change tenant plan.
 * Body: { plan: "maria"|"claudia"|"kiki"|"enterprise", expiresAt?: ISO date string }
 *
 * Ovo je JEDINI način da tenant dobije plaćeni plan bez Paddle naplate
 * (superadmin odobrenje) — sinhronizuje i Tenant i Subscription, jer
 * feature gating (requireFeature + /api/subscriptions/features) čita oba.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Subscription } from "@/models/Subscription";
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

    const expiry = expiresAt ? new Date(expiresAt) : null;
    if (expiry && isNaN(expiry.getTime())) {
      return NextResponse.json(
        { error: "Neispravan expiresAt datum" },
        { status: 400 },
      );
    }

    tenant.plan = plan;
    tenant.planExpiresAt = expiry;
    if (plan !== "maria") {
      tenant.paid = true;
      tenant.status = "active";
      tenant.verified = true;
    } else {
      // Povratak na besplatni plan — bez ovoga bi zaostali paid=true
      // i dalje otključavao plaćene funkcionalnosti kroz Tenant fallback.
      tenant.paid = false;
    }

    await tenant.save();

    // Sinhronizuj Subscription — /api/subscriptions/features i requireFeature
    // rešavaju plan prvenstveno iz Subscription zapisa. billingProvider
    // "internal" označava superadmin dodelu (rok se poštuje kroz periodEnd);
    // eventualna kasnija Paddle naplata pregaziće ovo kroz webhook sync.
    const now = new Date();
    await Subscription.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          plan,
          status: "active",
          billingProvider: "internal",
          currentPeriodStart: now,
          // Bez zadatog roka dodela ne ističe sama (10 godina).
          currentPeriodEnd:
            expiry ?? new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
        },
        $setOnInsert: { tenantId },
      },
      { upsert: true },
    );

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
