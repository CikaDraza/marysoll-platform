import "server-only";

import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import {
  getPlanFeatures,
  resolveActiveFeatureOverrides,
  resolveEffectivePlan,
  type PlanFeatures,
  type PlanName,
} from "@/lib/plans/planFeatures";
import { resolveCapability } from "@/lib/platform/capabilities";
import {
  isTenantCapability,
  type ResolvedCapability,
  type TenantCapabilityConfiguration,
  type TenantVertical,
} from "@/types/tenant-capabilities";
import { Subscription } from "@/models/Subscription";
import { Tenant } from "@/models/Tenant";

type CapabilityErrorCode =
  | "CAPABILITY_NOT_AVAILABLE"
  | "CAPABILITY_NOT_INCLUDED_IN_PLAN"
  | "CAPABILITY_NOT_ENABLED"
  | "TENANT_NOT_FOUND"
  | "CAPABILITY_RESOLUTION_FAILED";

interface TenantCapabilityRecord {
  verticals?: TenantVertical[];
  capabilityConfiguration?: TenantCapabilityConfiguration;
  plan?: PlanName;
  paid?: boolean;
  planExpiresAt?: Date | string | null;
}

interface SubscriptionPlanRecord {
  plan?: PlanName;
  status?: string;
  billingProvider?: string;
  currentPeriodEnd?: Date | string;
  featureOverrides?: Partial<PlanFeatures>;
  overrideExpiresAt?: Date | string;
}

type CapabilityLookup =
  | { kind: "resolved"; value: ResolvedCapability }
  | { kind: "tenant-not-found" }
  | { kind: "unknown-capability" };

async function lookupTenantCapability(
  tenantId: string | null | undefined,
  capability: unknown,
): Promise<CapabilityLookup> {
  if (!isTenantCapability(capability)) return { kind: "unknown-capability" };
  if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
    return { kind: "tenant-not-found" };
  }

  await connectToDB();

  const [tenant, subscription] = await Promise.all([
    Tenant.findById(tenantId)
      .select(
        "verticals capabilityConfiguration plan paid planExpiresAt",
      )
      .lean<TenantCapabilityRecord>(),
    Subscription.findOne({ tenantId }).lean<SubscriptionPlanRecord>(),
  ]);

  if (!tenant) return { kind: "tenant-not-found" };

  const plan = resolveEffectivePlan(subscription, tenant);
  const overrides = resolveActiveFeatureOverrides(subscription);
  const planFeatures = getPlanFeatures(plan, overrides);

  return {
    kind: "resolved",
    value: resolveCapability({ tenant, capability, planFeatures }),
  };
}

export async function resolveTenantCapability(
  tenantId: string | null | undefined,
  capability: unknown,
): Promise<ResolvedCapability | null> {
  const result = await lookupTenantCapability(tenantId, capability);
  return result.kind === "resolved" ? result.value : null;
}

function denied(
  code: CapabilityErrorCode,
  message: string,
  capability: unknown,
  status: 403 | 404 | 500 = 403,
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(typeof capability === "string" ? { capability } : {}),
    },
    { status },
  );
}

/**
 * Budući jedini server gate za capability domene.
 * T2B-A ga uvodi, ali ga još ne povezuje sa postojećim business rutama.
 */
export async function requireCapability(
  tenantId: string | null | undefined,
  capability: unknown,
): Promise<NextResponse | null> {
  try {
    const result = await lookupTenantCapability(tenantId, capability);

    if (result.kind === "unknown-capability") {
      return denied(
        "CAPABILITY_NOT_AVAILABLE",
        "Funkcionalnost nije dostupna na platformi",
        capability,
      );
    }
    if (result.kind === "tenant-not-found") {
      return denied(
        "TENANT_NOT_FOUND",
        "Tenant nije pronađen",
        capability,
        404,
      );
    }

    const resolved = result.value;
    if (!resolved.platformAvailable) {
      return denied(
        "CAPABILITY_NOT_AVAILABLE",
        "Funkcionalnost još nije dostupna na platformi",
        capability,
      );
    }
    if (!resolved.planEntitled) {
      return denied(
        "CAPABILITY_NOT_INCLUDED_IN_PLAN",
        "Vaš plan ne uključuje ovu funkcionalnost",
        capability,
      );
    }
    if (!resolved.tenantEnabled) {
      return denied(
        "CAPABILITY_NOT_ENABLED",
        "Funkcionalnost nije uključena za ovaj tenant",
        capability,
      );
    }

    return null;
  } catch (error: unknown) {
    console.error("[requireCapability] Capability lookup failed:", error);
    return denied(
      "CAPABILITY_RESOLUTION_FAILED",
      "Greška pri proveri funkcionalnosti",
      capability,
      500,
    );
  }
}
