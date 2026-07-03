/** Zajednička detekcija browsera/hosta za bannere (client-only helperi). */

export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

/** Vraća ime aplikacije ako je sajt otvoren u in-app pregledaču, inače null. */
export function detectInApp(ua: string): string | null {
  if (/instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return "Facebook";
  if (/messenger/i.test(ua)) return "Messenger";
  if (/tiktok|musical_ly|bytedance/i.test(ua)) return "TikTok";
  return null;
}

/** Platformski hostovi (marketing/admin/superadmin) — tenant sajtovi se izuzimaju. */
export function isPlatformHost(hostname: string): boolean {
  return (
    hostname === BASE_DOMAIN ||
    hostname === `admin.${BASE_DOMAIN}` ||
    hostname === `superadmin.${BASE_DOMAIN}` ||
    hostname === `www.${BASE_DOMAIN}`
  );
}

/** Da li sajt već radi kao instalirana PWA (standalone prozor). */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy flag
    (navigator as { standalone?: boolean }).standalone === true
  );
}
