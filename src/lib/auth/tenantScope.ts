/**
 * lib/auth/tenantScope.ts — izolacija tenanta za rute nad podacima klijenata.
 *
 * ZAŠTO POSTOJI: rute koje rade `findById(...)` nad `Appointment`-om (ili bilo
 * kojim tenant-scoped modelom) proveravaju SAMO da je pozivalac ulogovan, a ne i
 * da zapis pripada NJEGOVOM tenantu. Sa poznatim `_id`-jem admin jednog salona
 * je mogao da dohvati/izmeni/obriše zapis drugog salona.
 *
 * Pravilo: svaki upit nad tenant-scoped modelom mora da nosi `tenantId`, osim
 * kada je pozivalac SUPER_ADMIN (i tada se pristup loguje).
 *
 * `actorScopeFrom` ide korak dalje: za KLIJENTA (ne-admin tenant korisnik) uz
 * `tenantId` dodaje i `clientProfileId`, jer tenant izolacija sama ne sprečava
 * da klijent istog salona dira TUĐ termin — samo da dira termin drugog salona.
 *
 * Funkcije su čiste (primaju već dekodiran token) da bi bile testabilne bez
 * JWT-a i bez mreže.
 */

import { Types } from "mongoose";
import type { DecodedToken } from "@/types/auth/types";

export interface TenantScopeOk {
  ok: true;
  /** Filter koji se spaja u svaki upit; prazan samo za SUPER_ADMIN-a. */
  filter: { tenantId?: Types.ObjectId };
  isSuperAdmin: boolean;
}

export interface TenantScopeDenied {
  ok: false;
  status: 401 | 403;
  error: string;
}

export type TenantScope = TenantScopeOk | TenantScopeDenied;

export function tenantScopeFrom(decoded: DecodedToken | null): TenantScope {
  if (!decoded) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (decoded.isSuperAdmin) {
    // Namerno neograničen pristup — pozivalac je platformski administrator.
    return { ok: true, filter: {}, isSuperAdmin: true };
  }

  if (!decoded.tenantId || !Types.ObjectId.isValid(decoded.tenantId)) {
    return { ok: false, status: 403, error: "Forbidden: no tenant context" };
  }

  return {
    ok: true,
    filter: { tenantId: new Types.ObjectId(decoded.tenantId) },
    isSuperAdmin: false,
  };
}

/** Jedinstven zapis o neograničenom pristupu — uvek uz SUPER_ADMIN upit. */
export function logSuperAdminAccess(event: string, decoded: DecodedToken, path: string) {
  console.error(
    JSON.stringify({
      event,
      userId: decoded.id,
      path,
      timestamp: new Date().toISOString(),
    }),
  );
}

// ─── Ko dela: vlasnik zapisa vs privilegovan pozivalac ────────────────────────

export interface ActorScopeOk {
  ok: true;
  /** Filter za upit: `tenantId`, plus `clientProfileId` kada dela klijent. */
  filter: { tenantId?: Types.ObjectId; clientProfileId?: Types.ObjectId };
  /**
   * `client` sme samo SVOJ zapis; `admin` i `superadmin` imaju privilegije nad
   * zapisom (odobravanje, `completed`/`no_show`, predlog novog termina).
   * Ruta privilegije čita ODAVDE, ne iz golog `decoded.isAdmin` — token kaže
   * „ovaj korisnik je admin negde", a ne „admin je nad OVIM zapisom".
   */
  actor: "superadmin" | "admin" | "client";
  isSuperAdmin: boolean;
}

export type ActorScope = ActorScopeOk | TenantScopeDenied;

export function actorScopeFrom(decoded: DecodedToken | null): ActorScope {
  const tenant = tenantScopeFrom(decoded);
  if (!tenant.ok) return tenant;
  if (!decoded) return { ok: false, status: 401, error: "Unauthorized" };

  if (tenant.isSuperAdmin) {
    return { ok: true, filter: {}, actor: "superadmin", isSuperAdmin: true };
  }

  if (decoded.isAdmin) {
    return { ok: true, filter: tenant.filter, actor: "admin", isSuperAdmin: false };
  }

  // Klijent: bez `tenantUserId` nema čime da se dokaže vlasništvo nad zapisom.
  if (!decoded.tenantUserId || !Types.ObjectId.isValid(decoded.tenantUserId)) {
    return { ok: false, status: 403, error: "Forbidden: no client context" };
  }

  return {
    ok: true,
    filter: {
      ...tenant.filter,
      clientProfileId: new Types.ObjectId(decoded.tenantUserId),
    },
    actor: "client",
    isSuperAdmin: false,
  };
}
