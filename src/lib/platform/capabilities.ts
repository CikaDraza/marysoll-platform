import type { PlanFeatures } from "@/lib/plans/planFeatures";
import {
  TENANT_CAPABILITIES,
  isTenantCapability,
  tenantCapabilityConfigurationSchema,
  tenantVerticalsWriteSchema,
  type ResolvedCapability,
  type TenantCapability,
  type TenantCapabilityConfiguration,
  type TenantCapabilityOverride,
  type TenantVertical,
} from "@/types/tenant-capabilities";

type BooleanPlanFeature = {
  [K in keyof PlanFeatures]: PlanFeatures[K] extends boolean ? K : never;
}[keyof PlanFeatures];

type CapabilityPlanSource =
  | { readonly kind: "core" }
  | {
      readonly kind: "plan-feature";
      readonly feature: BooleanPlanFeature;
    }
  | { readonly kind: "unmapped" };

interface CapabilityDefinition {
  readonly platformAvailable: boolean;
  readonly plan: CapabilityPlanSource;
  readonly legacyBeautyDefault: boolean;
}

const CORE = { kind: "core" } as const;
const UNMAPPED = { kind: "unmapped" } as const;

export const TENANT_CAPABILITY_REGISTRY = {
  "services.catalog": {
    platformAvailable: true,
    plan: CORE,
    legacyBeautyDefault: true,
  },
  "booking.services": {
    platformAvailable: true,
    plan: { kind: "plan-feature", feature: "appointments" },
    legacyBeautyDefault: true,
  },
  "consultations.catalog": {
    platformAvailable: false,
    plan: UNMAPPED,
    legacyBeautyDefault: false,
  },
  "booking.consultations": {
    platformAvailable: false,
    plan: UNMAPPED,
    legacyBeautyDefault: false,
  },
  "questionnaires.forms": {
    platformAvailable: false,
    plan: UNMAPPED,
    legacyBeautyDefault: false,
  },
  "education.catalog": {
    platformAvailable: false,
    plan: UNMAPPED,
    legacyBeautyDefault: false,
  },
  "education.inquiries": {
    platformAvailable: false,
    plan: UNMAPPED,
    legacyBeautyDefault: false,
  },
  "booking.education": {
    platformAvailable: false,
    plan: UNMAPPED,
    legacyBeautyDefault: false,
  },
  "audience.contacts": {
    platformAvailable: true,
    plan: CORE,
    legacyBeautyDefault: true,
  },
  "distribution.campaigns": {
    platformAvailable: false,
    plan: UNMAPPED,
    legacyBeautyDefault: false,
  },
  "loyalty.rewards": {
    platformAvailable: true,
    plan: { kind: "plan-feature", feature: "loyaltyCore" },
    legacyBeautyDefault: true,
  },
} as const satisfies Record<TenantCapability, CapabilityDefinition>;

interface UnknownTenantCapabilityState {
  verticals?: readonly unknown[];
  capabilityConfiguration?: unknown;
}

function hasValidExplicitVerticals(
  tenant: UnknownTenantCapabilityState,
): tenant is UnknownTenantCapabilityState & {
  verticals: readonly TenantVertical[];
} {
  return tenantVerticalsWriteSchema.safeParse(tenant.verticals).success;
}

function readOverrides(
  configuration: unknown,
): readonly TenantCapabilityOverride[] | null {
  if (configuration === undefined) return [];
  const parsed = tenantCapabilityConfigurationSchema.safeParse(configuration);
  return parsed.success ? (parsed.data.overrides ?? []) : null;
}

export function resolveEffectiveVerticals(
  tenant: UnknownTenantCapabilityState,
): TenantVertical[] {
  if (tenant.verticals === undefined) return ["beauty"];
  if (!hasValidExplicitVerticals(tenant)) return [];
  return [...tenant.verticals];
}

export function resolveTenantEnabled(
  tenant: UnknownTenantCapabilityState,
  capability: unknown,
): boolean {
  if (!isTenantCapability(capability)) return false;

  const overrides = readOverrides(tenant.capabilityConfiguration);
  if (overrides === null) return false;

  if (tenant.verticals !== undefined && !hasValidExplicitVerticals(tenant)) {
    return false;
  }

  const explicit = overrides.find(
    (override) => override.capability === capability,
  );
  if (explicit) return explicit.enabled;

  if (tenant.verticals === undefined) {
    return TENANT_CAPABILITY_REGISTRY[capability].legacyBeautyDefault;
  }

  return false;
}

function resolveCapabilityPlanEntitlement(
  capability: TenantCapability,
  planFeatures: PlanFeatures,
): boolean {
  const source = TENANT_CAPABILITY_REGISTRY[capability].plan;
  if (source.kind === "core") return true;
  if (source.kind === "unmapped") return false;
  return planFeatures[source.feature] === true;
}

export function resolveCapability(params: {
  tenant: UnknownTenantCapabilityState;
  capability: TenantCapability;
  planFeatures: PlanFeatures;
}): ResolvedCapability {
  const definition = TENANT_CAPABILITY_REGISTRY[params.capability];
  const platformAvailable = definition.platformAvailable;
  const planEntitled = resolveCapabilityPlanEntitlement(
    params.capability,
    params.planFeatures,
  );
  const tenantEnabled = resolveTenantEnabled(
    params.tenant,
    params.capability,
  );

  return {
    capability: params.capability,
    enabled: platformAvailable && planEntitled && tenantEnabled,
    platformAvailable,
    planEntitled,
    tenantEnabled,
  };
}

export function resolveKnownCapability(params: {
  tenant: UnknownTenantCapabilityState;
  capability: unknown;
  planFeatures: PlanFeatures;
}): ResolvedCapability | null {
  if (!isTenantCapability(params.capability)) return null;
  return resolveCapability({
    tenant: params.tenant,
    capability: params.capability,
    planFeatures: params.planFeatures,
  });
}

export function createInitialTenantCapabilityConfiguration(): {
  verticals: TenantVertical[];
  capabilityConfiguration: TenantCapabilityConfiguration;
} {
  return {
    verticals: ["beauty"],
    capabilityConfiguration: {
      overrides: TENANT_CAPABILITIES.filter(
        (capability) =>
          TENANT_CAPABILITY_REGISTRY[capability].legacyBeautyDefault,
      ).map((capability) => ({ capability, enabled: true })),
    },
  };
}
