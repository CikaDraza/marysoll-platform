/**
 * Push support collector — da li ovaj browser kontekst uopšte može da primi
 * web push (Anja slučaj: iOS Safari tab nema Notification global, push radi
 * samo iz Home-Screen instalacije).
 */
import type { ModuleResult } from "../types";
import { capData, capDetail } from "../types";

export function collectPushSupport(): ModuleResult {
  const base = { key: "push", name: "Push notifikacije", ms: null };
  try {
    const hasNotification = typeof Notification !== "undefined";
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = typeof window !== "undefined" && "PushManager" in window;
    const permission = hasNotification ? Notification.permission : null;

    const data = { hasNotification, hasServiceWorker, hasPushManager, permission };

    if (hasNotification && hasServiceWorker && hasPushManager) {
      return {
        ...base,
        state: permission === "denied" ? "warn" : "ok",
        detail: capDetail(
          permission === "denied"
            ? "podržano, ali je dozvola odbijena u browseru"
            : `podržano (dozvola: ${permission ?? "?"})`,
        ),
        data: capData(data),
      };
    }

    return {
      ...base,
      state: "warn",
      detail: capDetail(
        !hasNotification
          ? "browser tab ne podržava notifikacije (iOS Safari? — radi samo kao Home-Screen aplikacija)"
          : "push delimično podržan u ovom kontekstu",
      ),
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
