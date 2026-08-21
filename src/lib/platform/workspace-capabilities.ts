import type {
  TenantCapability,
  TenantCapabilitySnapshot,
} from "@/types/tenant-capabilities";

/** Workspace je samo projekcija već razrešenog capability-ja. */
export const ADMIN_WORKSPACE_CAPABILITIES = {
  usluge: "services.catalog",
  termini: "booking.services",
  kalendar: "booking.services",
  klijenti: "audience.contacts",
  growth: "loyalty.rewards",
} as const satisfies Record<string, TenantCapability>;

export const CLIENT_WORKSPACE_CAPABILITIES = {
  "Moji Termini": "booking.services",
  Zakazivanja: "booking.services",
  Nagrade: "loyalty.rewards",
} as const satisfies Record<string, TenantCapability>;

export function isResolvedCapabilityEnabled(
  snapshot: TenantCapabilitySnapshot | undefined,
  capability: TenantCapability | undefined,
): boolean {
  // Učitavanje projekcije ne menja postojeći UI; server API gate je autoritet.
  if (!snapshot || !capability) return true;
  return snapshot.capabilities[capability].enabled;
}

export function isAdminWorkspaceTabAvailable(
  snapshot: TenantCapabilitySnapshot | undefined,
  tab: string,
): boolean {
  return isResolvedCapabilityEnabled(
    snapshot,
    ADMIN_WORKSPACE_CAPABILITIES[
      tab as keyof typeof ADMIN_WORKSPACE_CAPABILITIES
    ],
  );
}

export function isClientWorkspaceTabAvailable(
  snapshot: TenantCapabilitySnapshot | undefined,
  tab: string,
): boolean {
  return isResolvedCapabilityEnabled(
    snapshot,
    CLIENT_WORKSPACE_CAPABILITIES[
      tab as keyof typeof CLIENT_WORKSPACE_CAPABILITIES
    ],
  );
}
