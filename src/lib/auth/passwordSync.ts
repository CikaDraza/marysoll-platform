import "server-only";
import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import { AuthUser } from "@/models/AuthUser";

/**
 * Credential synchronization contract.
 *
 * Lozinka upravljačkog naloga živi na DVA mesta:
 *   · `TenantUser.password`     — prijava na salon
 *   · `AuthUser.passwordHash`   — platformski identitet
 *
 * Dok oba polja postoje, ona MORAJU predstavljati istu aktuelnu lozinku.
 * `AuthUser` nije tenant auth source; ovo je samo ugovor o sinhronizaciji.
 *
 * Zašto helper a ne ručni sync po ruti: divergencija je već jednom prošla
 * neopaženo (`/api/auth/change-password` je menjao samo `TenantUser`), pa je
 * vlasnica ostala sa dva različita hash-a i nije mogla da se prijavi kada je
 * jedan zapis nestao. Jedno mesto = jedno pravilo.
 *
 * Pravila:
 *   A) OWNER/ADMIN/STAFF sa `authUserId` → jedan hash u oba store-a
 *   B) USER/GUEST bez `authUserId`       → samo `TenantUser.password`
 *   C) SUPER_ADMIN                        → `AuthUser.passwordHash` je autoritet
 *      (nema `TenantUser` zapis; te rute ne prolaze ovuda)
 */

export const PASSWORD_SALT_ROUNDS = 12;

/**
 * Hešuje lozinku JEDNOM i, kada članstvo ima povezan platformski nalog,
 * upisuje isti hash u `AuthUser`. Vraća hash da ga pozivalac upiše na
 * `TenantUser` — namerno, jer rute pišu `TenantUser` na različite načine
 * (`doc.save()` vs `findByIdAndUpdate`).
 */
export async function hashPasswordAndSyncAuthUser(
  plainPassword: string,
  authUserId: Types.ObjectId | string | null | undefined,
): Promise<string> {
  const hash = await bcrypt.hash(plainPassword, PASSWORD_SALT_ROUNDS);

  if (authUserId) {
    await AuthUser.findByIdAndUpdate(authUserId, {
      $set: { passwordHash: hash },
    });
  }

  return hash;
}
