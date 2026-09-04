import {
  TENANT_REGISTRATION_PRESETS,
  type TenantRegistrationPreset,
} from "@/types/tenant-capabilities";

export type TenantRegistrationIdentity = {
  businessName: string;
  preset: TenantRegistrationPreset;
};

/**
 * Neutralni F0 registration contract. `salonName` je samo privremeni input
 * alias za stare klijente; novi UI šalje `businessName` + `preset`.
 */
export function resolveTenantRegistrationIdentity(
  input: unknown,
): TenantRegistrationIdentity | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  const rawName =
    body.businessName !== undefined ? body.businessName : body.salonName;
  if (typeof rawName !== "string" || !rawName.trim()) return null;

  const rawPreset = body.preset ?? "salon";
  if (
    typeof rawPreset !== "string" ||
    !TENANT_REGISTRATION_PRESETS.includes(
      rawPreset as TenantRegistrationPreset,
    )
  ) {
    return null;
  }

  return {
    businessName: rawName.trim(),
    preset: rawPreset as TenantRegistrationPreset,
  };
}
