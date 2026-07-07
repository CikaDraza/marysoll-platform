/**
 * Device collector — osnovni snimak uređaja/browsera/viewport-a.
 *
 * `hasNotificationGlobal` je direktna lekcija iz produkcije: iOS Safari tab
 * uopšte NEMA Notification global (postoji samo u Home-Screen web app režimu),
 * pa je `Notification.permission` rušio dashboard kod korisnice — ovaj
 * collector to sada vidi na prvi pogled.
 */
import type { ModuleResult } from "../types";
import { capData, capDetail } from "../types";

export function collectDevice(): ModuleResult {
  const base = { key: "device", name: "Uređaj i browser", ms: null };
  try {
    const nav = navigator;
    const standalone =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      // iOS Safari specifično polje (nije u tipovima)
      Boolean((nav as { standalone?: boolean }).standalone);

    const viewport = `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}x`;

    const data = {
      userAgent: nav.userAgent.slice(0, 300),
      language: nav.language,
      viewport,
      maxTouchPoints: nav.maxTouchPoints ?? 0,
      cookieEnabled: nav.cookieEnabled,
      online: nav.onLine,
      standalone,
      hasNotificationGlobal: typeof Notification !== "undefined",
      hasServiceWorker: "serviceWorker" in nav,
    };

    return {
      ...base,
      state: "info",
      detail: capDetail(`${viewport} · touch:${data.maxTouchPoints} · online:${data.online}`),
      data: capData(data),
    };
  } catch (err) {
    return {
      ...base,
      state: "fail",
      detail: capDetail(
        `collector pao (${err instanceof Error ? err.name : "greška"})`,
      ),
    };
  }
}
