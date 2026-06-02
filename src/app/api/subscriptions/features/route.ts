/**
 * GET /api/subscriptions/features
 *
 * Vraća efektivne feature-e za trenutnog admin korisnika.
 * Uključuje superadmin override ako postoji i nije istekao.
 *
 * Koristi: usePlanFeatures hook (client), FeatureGate komponenta
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { getPlanFeatures } from "@/lib/plans/planFeatures";
import type { PlanName } from "@/lib/plans/planFeatures";
import { Tenant } from "@/models/Tenant";
import { Subscription } from "@/models/Subscription";
import { ISubscription } from "@/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.response;
  const { decoded } = auth;

  if (!decoded.tenantId) {
    return NextResponse.json(
      { error: "Tenant nije pronađen" },
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    // Dohvati ili kreira Subscription
    let sub = await Subscription.findOne({
      tenantId: decoded.tenantId,
    }).lean<ISubscription>();

    if (!sub) {
      // Migracija: kreira Subscription za postojeći tenant
      const tenant = await Tenant.findById(decoded.tenantId)
        .select(
          "plan paid isTrialActive planExpiresAt lemonsqueezySubscriptionId lemonsqueezyCustomerId createdAt",
        )
        .lean();

      if (!tenant) {
        return NextResponse.json(
          { error: "Tenant nije pronađen" },
          { status: 404 },
        );
      }

      const t = tenant as Record<string, unknown>;
      const plan = (t.plan as PlanName) ?? "maria";
      const isTrialActive = Boolean(t.isTrialActive);
      const isPaid = Boolean(t.paid);

      const status = isTrialActive ? "trialing" : isPaid ? "active" : "expired";

      const created = await Subscription.create({
        tenantId: decoded.tenantId,
        plan,
        status,
        currentPeriodStart: (t.createdAt as Date) ?? new Date(),
        currentPeriodEnd:
          (t.planExpiresAt as Date) ??
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lsSubscriptionId: (t.lemonsqueezySubscriptionId as string) ?? null,
        lsCustomerId: (t.lemonsqueezyCustomerId as string) ?? null,
      });

      sub = created.toObject();
    }

    const s = sub as typeof sub & {
      plan: PlanName;
      featureOverrides: Record<string, unknown> | null;
      overrideExpiresAt: Date | null;
    };

    // Provjeri da li je override aktivan
    const overrides =
      s.featureOverrides &&
      s.overrideExpiresAt &&
      new Date() < new Date(s.overrideExpiresAt)
        ? s.featureOverrides
        : null;

    const features = getPlanFeatures(s.plan, overrides ?? undefined);

    return NextResponse.json({
      plan: s.plan,
      status: s.status,
      features,
      usage: s.usage,
      featureOverrides: overrides,
      overrideExpiresAt: s.overrideExpiresAt?.toISOString() ?? null,
      overrideNote: s.overrideNote ?? null,
      currentPeriodEnd: s.currentPeriodEnd
        ? new Date(s.currentPeriodEnd as unknown as Date).toISOString()
        : null,
    });
  } catch (err) {
    console.error("GET /api/subscriptions/features:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
