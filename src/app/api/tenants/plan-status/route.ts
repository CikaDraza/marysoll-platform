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
import { getPlanFeatures } from "@/lib/plans/planFeatures";
import type { PlanName, PlanFeatures } from "@/lib/plans/planFeatures";
import type { ITenant } from "@/models/Tenant";

type TenantPlanFields = Pick<
  ITenant,
  | "name"
  | "plan"
  | "status"
  | "isTrialActive"
  | "trialEndsAt"
  | "planExpiresAt"
  | "aiSettings"
  | "storageMetrics"
>;

export interface PlanStatusResponse {
  name: string;
  plan: PlanName;
  status: "active" | "suspended" | "pending" | "cancelled";
  isTrialActive: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  aiSettings: {
    chatEnabled: boolean;
    landingEnabled: boolean;
    imageEnabled: boolean;
    chatRpmLimit: number;
    landingRpmLimit: number;
    imageRpmLimit: number;
  };
  storageMetrics: {
    mongoUsageMb: number;
    cloudinaryUsageMb: number;
    updatedAt: string;
  };
  features: PlanFeatures;
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.success) return auth.response;

  const { decoded } = auth;
  if (!decoded.tenantId) {
    return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
  }

  try {
    await connectToDB();

    const tenant = await Tenant.findById(decoded.tenantId)
      .select(
        "name plan status isTrialActive trialEndsAt planExpiresAt aiSettings storageMetrics",
      )
      .lean<TenantPlanFields>();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
    }

    const plan = (tenant.plan ?? "free") as PlanName;
    const features = getPlanFeatures(plan);

    const response: PlanStatusResponse = {
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
      storageMetrics: {
        mongoUsageMb: tenant.storageMetrics?.mongoUsageMb ?? 0,
        cloudinaryUsageMb: tenant.storageMetrics?.cloudinaryUsageMb ?? 0,
        updatedAt: tenant.storageMetrics?.updatedAt
          ? new Date(tenant.storageMetrics.updatedAt).toISOString()
          : new Date().toISOString(),
      },
      features,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/tenants/plan-status:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
