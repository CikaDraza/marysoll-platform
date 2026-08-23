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
import {
  getPlanFeatures,
  resolveActiveFeatureOverrides,
  resolveEffectivePlan,
} from "@/lib/plans/planFeatures";
import type { PlanName } from "@/lib/plans/planFeatures";
import { Tenant } from "@/models/Tenant";
import { Subscription } from "@/models/Subscription";
import type { ISubscription } from "@/models/Subscription";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
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

    // Dohvati ili kreira Subscription + Tenant (za rešavanje efektivnog plana)
    const [subExisting, tenantRaw] = await Promise.all([
      Subscription.findOne({ tenantId: decoded.tenantId }).lean<ISubscription>(),
      Tenant.findById(decoded.tenantId)
        .select("plan paid isTrialActive planExpiresAt createdAt")
        .lean(),
    ]);

    if (!tenantRaw) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 404 },
      );
    }

    const t = tenantRaw as Record<string, unknown>;
    let sub = subExisting;

    if (!sub) {
      // Migracija: kreira Subscription za postojeći tenant
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
      });

      sub = created.toObject();
    }

    const s = sub as typeof sub & {
      plan: PlanName;
      status: string;
      billingProvider?: string;
      currentPeriodEnd?: Date;
      featureOverrides: Record<string, unknown> | null;
      overrideExpiresAt: Date | null;
    };

    // Provjeri da li je override aktivan
    const overrides = resolveActiveFeatureOverrides({
      featureOverrides: s.featureOverrides,
      overrideExpiresAt: s.overrideExpiresAt,
    });

    // Ista logika kao requireFeature: otkazana/istekla pretplata pada na
    // "maria"; superadmin dodela (Subscription internal ili Tenant.paid) važi.
    const effectivePlan = resolveEffectivePlan(s, {
      plan: t.plan as PlanName | undefined,
      paid: Boolean(t.paid),
      planExpiresAt: (t.planExpiresAt as Date | null) ?? null,
    });

    const features = getPlanFeatures(effectivePlan, overrides ?? undefined);

    return NextResponse.json({
      plan: effectivePlan,
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
