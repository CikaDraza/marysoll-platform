/**
 * Canonical tenant-role semantics.
 *
 * Ovaj modul je namerno bez DB/Next zavisnosti: isti recnik koriste login,
 * proxy, client redirect i server authority. Role check po rutama ne sme da
 * ponovo izmisli da je STAFF administrator.
 */
export type TenantRole = "OWNER" | "ADMIN" | "STAFF" | "USER" | "GUEST";

const BACKOFFICE_ROLES = new Set<TenantRole>(["OWNER", "ADMIN", "STAFF"]);
const BUSINESS_ADMIN_ROLES = new Set<TenantRole>(["OWNER", "ADMIN"]);
const SALON_OPERATOR_ROLES = new Set<TenantRole>(["OWNER", "ADMIN", "STAFF"]);

export function asTenantRole(role: unknown): TenantRole | null {
  return typeof role === "string" &&
    ["OWNER", "ADMIN", "STAFF", "USER", "GUEST"].includes(role)
    ? (role as TenantRole)
    : null;
}

export function isBackofficeRole(role: unknown): boolean {
  const normalized = asTenantRole(role);
  return normalized != null && BACKOFFICE_ROLES.has(normalized);
}

export function isBusinessAdminRole(role: unknown): boolean {
  const normalized = asTenantRole(role);
  return normalized != null && BUSINESS_ADMIN_ROLES.has(normalized);
}

export function isOwnerRole(role: unknown): boolean {
  return asTenantRole(role) === "OWNER";
}

export function isSalonOperatorRole(role: unknown): boolean {
  const normalized = asTenantRole(role);
  return normalized != null && SALON_OPERATOR_ROLES.has(normalized);
}

/**
 * Stari owner/admin tokeni bez globalRole ostaju upotrebljivi do isteka.
 * STAFF tokeni vec nose globalRole=STAFF, pa nikad ne padaju na legacy
 * isAdmin=true fallback.
 */
export function tokenHasBackofficeAccess(token: {
  globalRole?: unknown;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}): boolean {
  if (token.isSuperAdmin) return true;
  const role = asTenantRole(token.globalRole);
  return role ? isBackofficeRole(role) : token.isAdmin === true;
}
