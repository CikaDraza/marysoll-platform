/**
 * types/roles.ts
 *
 * Centralna definicija svih rola u Marysoll platformi.
 *
 * Arhitektura:
 *   - User.globalRole → globalna rola korisnika (SUPER_ADMIN, OWNER, ADMIN, STAFF, USER)
 *   - Tenant-specifični pristup se kontroliše kroz globalRole + tenantId na User-u.
 *
 * SUPER_ADMIN = platforma-level pristup svim salonima.
 * OWNER       = vlasnik salona (tenant admin).
 * ADMIN       = admin salona.
 * STAFF       = zaposleni u salonu.
 * USER        = obični klijent registrovan na salonu.
 */

// ─── Globalna rola (User.globalRole) ─────────────────────────────────────────

export type GlobalRole = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "STAFF" | "USER";

// ─── Sve role (alias za GlobalRole) ──────────────────────────────────────────

export type AnyRole = GlobalRole;

// ─── Permisije po globalnoj roli ─────────────────────────────────────────────

export const GLOBAL_ROLE_PERMISSIONS: Record<GlobalRole, string[]> = {
  SUPER_ADMIN: ["*"],
  OWNER: [
    "salon:read",
    "salon:update",
    "salon:delete",
    "services:manage",
    "appointments:manage",
    "clients:manage",
    "staff:manage",
    "statistics:read",
    "subscription:manage",
    "newsletter:manage",
    "loyalty:manage",
  ],
  ADMIN: [
    "salon:read",
    "salon:update",
    "services:manage",
    "appointments:manage",
    "clients:manage",
    "statistics:read",
    "newsletter:manage",
    "loyalty:manage",
  ],
  STAFF: [
    "salon:read",
    "appointments:own:read",
    "appointments:own:update",
    "loyalty:read",
  ],
  USER: [
    "appointments:own:read",
    "appointments:own:create",
    "appointments:own:cancel",
    "testimonials:own:manage",
    "profile:own:update",
    "loyalty:own:read",
  ],
};

// ─── Helper: da li rola ima admin pristup ────────────────────────────────────

export function isAdminRole(role: GlobalRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isStaffOrAbove(role: GlobalRole): boolean {
  return role !== "USER";
}

export function hasPermission(role: GlobalRole, permission: string): boolean {
  const perms = GLOBAL_ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes("*") || perms.includes(permission);
}
