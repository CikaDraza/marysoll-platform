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
 * Funkcija je čista (prima već dekodiran token) da bi bila testabilna bez JWT-a
 * i bez mreže.
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
