"use client";

/**
 * Checkout intent — "zapamti izabrani plaćeni plan kroz auth".
 *
 * Kad ANONIMAN posetilac na marketing/pricing klikne plaćeni plan, mora prvo da
 * se uloguje/registruje (uz email verifikaciju). Da izbor plana ne bi bio izgubljen,
 * upisujemo ga u cookie scope-ovan na `.marysoll.com` — preživljava ceo lanac
 * (register → verify email → login) i vidljiv je i na `admin.marysoll.com`, gde
 * dashboard po prijavi pročita intent i automatski otvori checkout za taj plan.
 *
 * Nije osetljiv podatak (samo slug plana), pa je JS-readable cookie u redu.
 */

const KEY = "ms_checkout_intent";
const PAID_PLAN_SLUGS = new Set(["claudia", "kiki"]);
const MAX_AGE_SECONDS = 24 * 60 * 60; // 24h — pokriva i email verifikaciju

function isLocalHost(): boolean {
  const host = window.location.hostname;
  return host === "localhost" || host.startsWith("127.");
}

/** `; domain=.marysoll.com; secure` u prod-u; ništa na localhost-u (single origin). */
function scopeAttrs(): string {
  if (isLocalHost()) return "";
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  return `; domain=.${base}; secure`;
}

/** Upisi izabrani plaćeni plan (no-op za nepoznat/besplatan slug). */
export function setCheckoutIntent(slug: string): void {
  if (typeof document === "undefined") return;
  const normalized = slug.trim().toLowerCase();
  if (!PAID_PLAN_SLUGS.has(normalized)) return;
  document.cookie = `${KEY}=${encodeURIComponent(normalized)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${scopeAttrs()}`;
}

/** Pročitaj sačuvani plaćeni plan (ili null ako nema/nije validan). */
export function readCheckoutIntent(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)ms_checkout_intent=([^;]+)/);
  const val = m ? decodeURIComponent(m[1]).toLowerCase() : null;
  return val && PAID_PLAN_SLUGS.has(val) ? val : null;
}

/** Obriši intent (posle iskorišćenja). Isti scope kao pri upisu da bi se stvarno uklonio. */
export function clearCheckoutIntent(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${KEY}=; path=/; max-age=0${scopeAttrs()}`;
}
