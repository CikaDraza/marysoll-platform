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

/**
 * Resolves the base URL for internal API calls.
 * In production uses NEXT_PUBLIC_APP_URL, in dev falls back to localhost.
 */
function getBaseUrl(): string {
  // U dev modu interni pozivi MORAJU ići na lokalni server. NEXT_PUBLIC_APP_URL
  // pokazuje na produkciju (npr. https://marysoll.com), pa bi inače dev čitao
  // produkcijske podatke (staro radno vreme umesto lokalnih ručnih termina).
  if (process.env.NODE_ENV !== "production") {
    return `http://localhost:${process.env.PORT ?? "3006"}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return `http://localhost:${process.env.PORT ?? "3006"}`;
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
    const res = await fetch(
      `${base}/api/public/${tenantSlug}/appointments`,
      { cache: "no-store" }, // always fresh for calendar
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
