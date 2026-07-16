/**
 * Browser context collector — da li je stranica otvorena u IN-APP pregledaču
 * (Instagram / Facebook / Messenger / TikTok WebView).
 *
 * Ključno iz produkcije: klijentkinje otvaraju salon iz linka na Instagramu i
 * OSTAJU u IG in-app pregledaču (ne izlaze u Safari). Ti WebView-i imaju
 * ograničenja (storage/PWA/JS/hidracija) i čest su uzrok "ne učita se".
 * Ovaj collector to vidi na prvi pogled.
 */
import type { ModuleResult } from "../types";
import { capData, capDetail } from "../types";

/** Vraća ime aplikacije ako je in-app pregledač, inače null. */
export function detectInApp(ua: string): string | null {
  if (/instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return "Facebook";
  if (/messenger/i.test(ua)) return "Messenger";
  if (/tiktok|musical_ly|bytedance/i.test(ua)) return "TikTok";
  return null;
}

export function collectBrowserContext(): ModuleResult {
  const base = { key: "browser", name: "Pregledač", ms: null };
  try {
    const ua = navigator.userAgent;
    const inApp = detectInApp(ua);
    const standalone =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      Boolean((navigator as { standalone?: boolean }).standalone);
    const isIOS = /iPad|iPhone|iPod/.test(ua);

    const data = { inApp, standalone, isIOS };
    return {
      ...base,
      state: inApp ? "warn" : "ok",
      detail: capDetail(
        inApp
          ? `otvoreno u ${inApp} in-app pregledaču — WebView ograničenja su čest uzrok "ne učita se"; savet: otvoriti u pravom browseru`
          : standalone
            ? "instalirana aplikacija (PWA)"
            : "standardni browser",
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
