import "server-only";
/**
 * Odredišta klika na notifikaciju (web push).
 *
 * Putanje su ROOT-RELATIVNE namerno: service worker ih razrešava u odnosu na
 * origin na kome je pretplata napravljena, pa isti kod ispravno radi na
 * produkciji, staging-u i u dev-u — i nema rizika od cross-origin `navigate()`.
 *
 * Admin panel je uvek `/dashboard?tab=…` (i na `admin.marysoll.com` i na
 * path-based hostovima). Ranije su ovde stajale `/admin/*` putanje — takva ruta
 * NE POSTOJI, pa je klik na push vodio u 404, i to i u produkciji.
 *
 * Klijentski panel zavisi od okruženja: `/panel` na tenant domenu, a
 * `/{slug}/panel` tamo gde je salon path-based (staging/qa/dev/preview).
 */
import { Types } from "mongoose";
import { Tenant } from "@/models/Tenant";
import { isPathBasedEnvironment } from "@/lib/platform/host-context";

/** Admin: lista termina (deep-link na termin ide `&appointmentId=…`). */
export const ADMIN_APPOINTMENTS_PATH = "/dashboard?tab=termini";
/** Admin: preporuke/utisci. */
export const ADMIN_TESTIMONIALS_PATH = "/dashboard?tab=preporuke";
/** Admin: chat (uključuje i Marysoll podršku / superadmina). */
export const ADMIN_CHAT_PATH = "/dashboard?tab=chat";
/** SuperAdmin panel. */
export const SUPERADMIN_PATH = "/superadmin";

async function resolveTenantSlug(
  tenantId: Types.ObjectId | string,
): Promise<string | null> {
  try {
    const tenant = (await Tenant.findById(tenantId)
      .select("slug")
      .lean()) as { slug?: string } | null;
    return tenant?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Putanja klijentskog panela salona, npr. `clientPanelPath(id, "?tab=Nagrade")`.
 *
 * U produkciji NE dira bazu — salon je tamo na sopstvenom hostu, pa je `/panel`
 * već tačno. Slug se traži samo u path-based okruženjima.
 */
export async function clientPanelPath(
  tenantId: Types.ObjectId | string,
  query = "",
): Promise<string> {
  const path = `/panel${query}`;
  if (!isPathBasedEnvironment()) return path;

  const slug = await resolveTenantSlug(tenantId);
  return slug ? `/${slug}${path}` : path;
}
