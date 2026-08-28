import type {
  TenantCapability,
  TenantCapabilitySnapshot,
} from "@/types/tenant-capabilities";

export type AdminWorkspace = "salon" | "education";

export interface AdminWorkspaceNavigation {
  salon: boolean;
  education: boolean;
  initialWorkspace: AdminWorkspace | null;
}

/**
 * Workspace identity comes from server-resolved verticals. Capability remains
 * an additional availability gate; it is never used to guess the vertical.
 */
export function resolveAdminWorkspaceNavigation(
  snapshot: TenantCapabilitySnapshot | undefined,
): AdminWorkspaceNavigation {
  // Preserve existing Salon loading behavior. The new Education link remains
  // hidden until the server projection is known.
  if (!snapshot) {
    return { salon: true, education: false, initialWorkspace: "salon" };
  }

  const salon = snapshot.verticals.includes("beauty");
  const education =
    snapshot.verticals.includes("education") &&
    snapshot.capabilities["education.catalog"].enabled;

  return {
    salon,
    education,
    initialWorkspace: salon ? "salon" : education ? "education" : null,
  };
}

export function initialAdminWorkspacePath(
  snapshot: TenantCapabilitySnapshot | undefined,
): "/dashboard" | "/education" {
  return resolveAdminWorkspaceNavigation(snapshot).initialWorkspace ===
    "education"
    ? "/education"
    : "/dashboard";
}

/** Workspace je samo projekcija već razrešenog capability-ja. */
const ADMIN_WORKSPACE_CAPABILITIES = {
  usluge: "services.catalog",
  termini: "booking.services",
  kalendar: "booking.services",
  klijenti: "audience.contacts",
  growth: "loyalty.rewards",
} as const satisfies Record<string, TenantCapability>;

const CLIENT_WORKSPACE_CAPABILITIES = {
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
