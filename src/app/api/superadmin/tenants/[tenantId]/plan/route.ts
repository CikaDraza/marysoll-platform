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
import { cancelPaddleSubscription } from "@/lib/paddle";

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

    // Postojeća pretplata — ako je Paddle-backed i vraćamo na Maria, moramo je
    // otkazati u Paddle-u; inače Paddle nastavlja naplatu i sledeći renewal
    // webhook (subscription.updated) vraća plaćeni plan (DB promena bi bila privremena).
    const existingSub = await Subscription.findOne({ tenantId })
      .select("billingProvider paddleSubscriptionId status")
      .lean<{
        billingProvider?: string;
        paddleSubscriptionId?: string | null;
        status?: string;
      }>();
    const hasActivePaddleSub =
      existingSub?.billingProvider === "paddle" &&
      !!existingSub?.paddleSubscriptionId &&
      existingSub?.status !== "cancelled";

    let paddleCancelWarning: string | null = null;
    const cancelPaddle = plan === "maria" && hasActivePaddleSub;
    if (cancelPaddle) {
      try {
        await cancelPaddleSubscription(
          existingSub!.paddleSubscriptionId!,
          "immediately",
        );
      } catch (e) {
        console.error("[superadmin/plan] Paddle cancel nije uspeo:", e);
        paddleCancelWarning =
          "Plan je promenjen u bazi, ali otkazivanje Paddle pretplate nije uspelo — otkažite je ručno u Paddle dashboard-u da se ne bi ponovo naplatila.";
      }
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
    // rešavaju plan prvenstveno iz Subscription zapisa.
    const now = new Date();
    if (cancelPaddle) {
      // Paddle pretplata je (pokušano) otkazana → zapis odražava otkazivanje;
      // subscription.canceled webhook će dodatno potvrditi/mejlovati vlasnika.
      // Ne diramo billingProvider/paddle ID-jeve (ostaju kao trag).
      await Subscription.updateOne(
        { tenantId },
        { $set: { plan: "maria", status: "cancelled", cancelAtPeriodEnd: false } },
      );
    } else {
      // Superadmin dodela/izmena. billingProvider "internal" = ručna dodela
      // (rok kroz periodEnd); kasnija Paddle naplata pregaziće ovo webhook sync-om.
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
    }

    return NextResponse.json({
      success: true,
      message: paddleCancelWarning ?? `Plan promenjen na: ${plan}.`,
      warning: paddleCancelWarning ?? undefined,
      plan: tenant.plan,
      planExpiresAt: tenant.planExpiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("PATCH /api/superadmin/tenants/[tenantId]/plan:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
