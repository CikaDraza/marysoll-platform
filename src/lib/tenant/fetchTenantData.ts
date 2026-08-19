/**
 * lib/tenant/fetchTenantData.ts
 *
 * SERVER-ONLY — fetches tenant public data for Server Component pages.
 * Uses internal API routes to keep data fetching consistent.
 *
 * All returned objects are plain JSON — no Mongoose docs, no ObjectIds.
 */
import "server-only";

import type { SalonProfileData, IService, IAppointment } from "@/types";
import { platformOrigin } from "@/lib/platform/host-context";
import { VERCEL_BYPASS_HEADERS } from "@/lib/platform/internal-fetch";

/**
 * Base URL za INTERNE API pozive — uvek origin OVOG okruženja (dev čita lokalni
 * server, staging staging, produkcija produkciju). Vidi lib/platform/host-context.
 *
 * Vercel preview je zaštićen Deployment Protection-om, pa fetch ka SOPSTVENOM
 * deployu nosi bypass header (isti kao interni proxy pozivi).
 */
function getBaseUrl(): string {
  return platformOrigin();
}

export async function fetchPublicSalonProfile(
  tenantSlug: string,
  opts?: { noStore?: boolean },
): Promise<SalonProfileData | null> {
  try {
    const base = getBaseUrl();
    // Stranice koje zavise od dostupnosti (npr. /termini) traže svež profil da
    // se promena radnog vremena / ručnih termina vidi odmah, bez 5-min keša.
    const res = await fetch(`${base}/api/public/${tenantSlug}/salon-profile`, {
      headers: VERCEL_BYPASS_HEADERS,
      ...(opts?.noStore
        ? { cache: "no-store" }
        : { next: { revalidate: 300 } }), // 5 min cache (default)
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchPublicServices(
  tenantSlug: string,
): Promise<IService[]> {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/public/${tenantSlug}/services`, {
      headers: VERCEL_BYPASS_HEADERS,
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchPublicAppointments(
  tenantSlug: string,
): Promise<IAppointment[]> {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/public/${tenantSlug}/appointments`, {
      headers: VERCEL_BYPASS_HEADERS,
      cache: "no-store", // always fresh for calendar
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
