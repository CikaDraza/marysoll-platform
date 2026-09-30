/**
 * GET /api/tenants/plan-status
 *
 * Admin-only. Vraća kompletan pregled plana, statusa, AI podešavanja
 * i storage metrika za aktivan tenant admina.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireAdmin } from "@/lib/auth/auth-server";
import { resolveTenantPlanFeatures } from "@/lib/plans/planEnforcement";
import type { ITenant } from "@/models/Tenant";
import { getCurrentResourceQuotaCalibration } from "@/lib/superadmin/resourceQuotaCalibration";
import { buildTenantResourceUsage } from "@/lib/plans/resourceQuotas";
import { planStatusDataSchema } from "@/types/plan-status";

type TenantPlanFields = Pick<
  ITenant,
  | "name"
  | "status"
  | "isTrialActive"
  | "trialEndsAt"
  | "planExpiresAt"
  | "aiSettings"
  | "storageMetrics"
>;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.success) return auth.response;

  const { decoded } = auth;
  if (!decoded.tenantId) {
    return NextResponse.json(
      { error: "Tenant nije pronađen" },
      { status: 404 },
    );
  }

  try {
    await connectToDB();

    const tenant = await Tenant.findById(decoded.tenantId)
      .select(
        "name status isTrialActive trialEndsAt planExpiresAt aiSettings storageMetrics",
      )
      .lean<TenantPlanFields>();

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 404 },
      );
    }

    // Isti effective-plan resolver kao requireFeature i
    // /api/subscriptions/features — kvota ne sme da čita sirovi Tenant.plan.
    const [{ plan, features }, calibration] = await Promise.all([
      resolveTenantPlanFeatures(decoded.tenantId),
      getCurrentResourceQuotaCalibration(),
    ]);
    const updatedAt = tenant.storageMetrics?.updatedAt
      ? new Date(tenant.storageMetrics.updatedAt).toISOString()
      : new Date().toISOString();
    const resourceUsage = buildTenantResourceUsage({
      plan,
      mongoUsageMb: tenant.storageMetrics?.mongoUsageMb ?? 0,
      cloudinaryUsageMb: tenant.storageMetrics?.cloudinaryUsageMb ?? 0,
      updatedAt,
      baseline: calibration
        ? {
            mongoMb: calibration.mongoMb,
            cloudinaryMb: calibration.cloudinaryMb,
          }
        : null,
    });

    const response = planStatusDataSchema.parse({
      name: tenant.name ?? "",
      plan,
      status: tenant.status ?? "pending",
      isTrialActive: Boolean(tenant.isTrialActive),
      trialEndsAt: tenant.trialEndsAt
        ? new Date(tenant.trialEndsAt).toISOString()
        : null,
      planExpiresAt: tenant.planExpiresAt
        ? new Date(tenant.planExpiresAt).toISOString()
        : null,
      aiSettings: {
        chatEnabled: Boolean(tenant.aiSettings?.chatEnabled),
        landingEnabled: Boolean(tenant.aiSettings?.landingEnabled),
        imageEnabled: Boolean(tenant.aiSettings?.imageEnabled),
        chatRpmLimit: tenant.aiSettings?.chatRpmLimit ?? 0,
        landingRpmLimit: tenant.aiSettings?.landingRpmLimit ?? 0,
        imageRpmLimit: tenant.aiSettings?.imageRpmLimit ?? 0,
      },
      resourceUsage,
      features,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/tenants/plan-status:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
