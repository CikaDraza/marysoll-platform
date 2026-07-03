/**
 * Potpuni reset browser podataka za sajt — self-service za netehničke
 * korisnike kojima zaglavi keš/kolačići (isti princip kao zvonce za ponovno
 * uključivanje notifikacija). Prvo klijentski obriše šta JS sme (fallback za
 * starije browsere), a onda ode na /api/browser-reset koji kroz Clear-Site-Data
 * briše i HTTP keš i HttpOnly kolačiće. Korisnik završi na početnoj, odjavljen,
 * sa cookies modalom kao pri prvoj poseti.
 *
 * Client-only: koristi window/document, zvati isključivo iz klijentskih
 * komponenti (event handler).
 */
export async function resetBrowserData() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* Safari private mode može da baci — nastavljamo */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    if (regs) await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }
  // JS-vidljivi kolačići: gasimo i za host i za .basedomain (HttpOnly gasi ruta)
  try {
    const base = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
    const expired = "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (!name) return;
      document.cookie = `${name}${expired}`;
      document.cookie = `${name}${expired}; domain=.${base}`;
    });
  } catch {
    /* ignore */
  }
  window.location.href = "/api/browser-reset?next=/";
}

/** Confirm + reset — zajednički handler za dugmad "Obriši keš sajta". */
export function confirmAndResetBrowserData(): boolean {
  const ok = window.confirm(
    "Ovo briše sačuvane podatke sajta u vašem browseru (keš, kolačiće) i odjaviće vas. Koristite ako vam se stranice ne učitavaju ispravno. Nastaviti?",
  );
  if (ok) void resetBrowserData();
  return ok;
}
