import { z } from "zod";

export const TENANT_VERTICALS = ["beauty", "education"] as const;

export type TenantVertical = (typeof TENANT_VERTICALS)[number];

export const TENANT_REGISTRATION_PRESETS = [
  "salon",
  "education",
  "hybrid",
] as const;

export type TenantRegistrationPreset =
  (typeof TENANT_REGISTRATION_PRESETS)[number];

export const TENANT_CAPABILITIES = [
  "services.catalog",
  "booking.services",
  "consultations.catalog",
  "booking.consultations",
  "questionnaires.forms",
  "education.catalog",
  "education.inquiries",
  "booking.education",
  "audience.contacts",
  "distribution.campaigns",
  "loyalty.rewards",
] as const;

export type TenantCapability = (typeof TENANT_CAPABILITIES)[number];

export interface TenantCapabilityOverride {
  capability: TenantCapability;
  enabled: boolean;
}

export interface TenantCapabilityConfiguration {
  overrides?: TenantCapabilityOverride[];
}

export interface ResolvedCapability {
  capability: TenantCapability;
  enabled: boolean;
  platformAvailable: boolean;
  planEntitled: boolean;
  tenantEnabled: boolean;
}

/**
 * Jedina serializovana projekcija koju UI dobija za capability-aware workspace.
 * Plan, vertikale i tenant override-i se nikada ne računaju u browseru.
 */
export type TenantCapabilitySnapshot = {
  /** Server-resolved workspace identity; legacy missing verticals become beauty. */
  verticals: TenantVertical[];
  capabilities: Record<TenantCapability, ResolvedCapability>;
};

export type CapabilityReadiness = "unconfigured" | "ready" | "degraded";

const tenantVerticalSchema = z.enum(TENANT_VERTICALS);
const tenantCapabilitySchema = z.enum(TENANT_CAPABILITIES);

const uniqueValues = <T>(values: readonly T[]) =>
  new Set(values).size === values.length;

export const tenantVerticalsWriteSchema = z
  .array(tenantVerticalSchema)
  .min(1, "Tenant mora imati najmanje jednu vertikalu")
  .refine(uniqueValues, "Vertikale ne smeju biti duplirane");

const tenantCapabilityOverrideSchema = z.object({
  capability: tenantCapabilitySchema,
  enabled: z.boolean(),
});

export const tenantCapabilityConfigurationSchema = z
  .object({
    overrides: z
      .array(tenantCapabilityOverrideSchema)
      .refine(
        (overrides) =>
          uniqueValues(overrides.map((override) => override.capability)),
        "Capability override-i ne smeju biti duplirani",
      )
      .optional(),
  })
  .strict();

export const tenantCapabilityStateWriteSchema = z
  .object({
    verticals: tenantVerticalsWriteSchema.optional(),
    capabilityConfiguration: tenantCapabilityConfigurationSchema.optional(),
  })
  .strict();

export function isTenantCapability(value: unknown): value is TenantCapability {
  return tenantCapabilitySchema.safeParse(value).success;
}
