/**
 * types/roles.ts
 *
 * Centralna definicija svih rola u Marysoll platformi.
 *
 * Arhitektura:
 *   - User.globalRole   → globalna rola (SUPER_ADMIN ili USER)
 *   - UserSalon.role    → rola unutar konkretnog salona (per-tenant)
 *
 * Klijent (CLIENT) se registruje na salon stranicu i ima rolu unutar tog salona.
 * Admin (SALON_ADMIN, SALON_OWNER) ima rolu unutar salona gdje radi.
 * Super admin (SUPER_ADMIN) ima globalnu rolu i vidljivost svih salona.
 */

// ─── Globalna rola (User.globalRole) ─────────────────────────────────────────

export type GlobalRole = "SUPER_ADMIN" | "USER";

// ─── Rola unutar salona (UserSalon.role) ─────────────────────────────────────

export type SalonRole = "SALON_OWNER" | "SALON_ADMIN" | "STAFF" | "CLIENT";

// ─── Sve role zajedno ─────────────────────────────────────────────────────────

export type AnyRole = GlobalRole | SalonRole;

// ─── Permisije po roli ────────────────────────────────────────────────────────

export const SALON_ROLE_PERMISSIONS: Record<SalonRole, string[]> = {
  SALON_OWNER: [
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
  SALON_ADMIN: [
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
  CLIENT: [
    "appointments:own:read",
    "appointments:own:create",
    "appointments:own:cancel",
    "testimonials:own:manage",
    "profile:own:update",
    "loyalty:own:read",
  ],
};

// ─── Helper: da li rola ima admin pristup ────────────────────────────────────

export function isAdminRole(role: SalonRole): boolean {
  return role === "SALON_OWNER" || role === "SALON_ADMIN";
}

export function isStaffOrAbove(role: SalonRole): boolean {
  return role !== "CLIENT";
}

export function hasPermission(role: SalonRole, permission: string): boolean {
  return SALON_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
