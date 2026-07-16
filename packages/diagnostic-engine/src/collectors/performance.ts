/**
 * Performance collectori — mere PRVI load (najbolniji na starijem/slabijem
 * uređaju BEZ keša): koliko traje učitavanje u sekundama, LCP (najveća
 * slika/sticker), i da li CSS/JS/slike stižu ili ih nešto blokira.
 *
 * Sve je best-effort (Navigation/Resource Timing + LCP PerformanceObserver);
 * ako API nema ili nešto pukne, vrati "info"/"fail" BEZ bacanja (types.ts #1).
 */
import type { ModuleResult } from "../types";
import { capData, capDetail } from "../types";

const sec = (ms: number) => Math.round(ms) / 1000;
const fileName = (url: string) =>
  url.split("/").pop()?.split("?")[0] || url.slice(0, 80);

/** Koliko je trajalo učitavanje (Navigation Timing) + da li je prvi load ili reload. */
export function collectLoadTiming(): ModuleResult {
  const base = { key: "timing", name: "Vreme učitavanja", ms: null };
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!nav) {
      return {
        ...base,
        state: "info",
        detail: capDetail("Navigation Timing nedostupan"),
      };
    }
    const loadMs = nav.loadEventEnd || performance.now();
    const isReload = nav.type === "reload" || nav.type === "back_forward";
    const data = {
      ttfb_s: sec(nav.responseStart),
      domContentLoaded_s: sec(nav.domContentLoadedEventEnd || nav.domInteractive),
      load_s: sec(loadMs),
      navType: nav.type,
      firstVisit: !isReload,
    };
    // Pragovi (bez keša na mobilnom): <3s ok, 3–6s sporo, >6s jako sporo.
    const state: ModuleResult["state"] =
      loadMs <= 3000 ? "ok" : loadMs <= 6000 ? "warn" : "fail";
    return {
      ...base,
      ms: Math.round(loadMs),
      state,
      detail: capDetail(
        `${data.load_s}s (TTFB ${data.ttfb_s}s · DOM ${data.domContentLoaded_s}s) · ${isReload ? "reload/keš" : "PRVI load"}`,
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

/** LCP — najveći renderovani element (obično wallpaper ili hero slika/sticker). */
export async function collectLcp(): Promise<ModuleResult> {
  const base = { key: "lcp", name: "LCP (najveća slika)", ms: null };
  try {
    if (typeof PerformanceObserver === "undefined") {
      return { ...base, state: "info", detail: capDetail("LCP API nedostupan") };
    }
    const entry = await new Promise<LargestContentfulPaint | null>((resolve) => {
      let last: LargestContentfulPaint | null = null;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        try {
          po.disconnect();
        } catch {
          /* ignore */
        }
        resolve(last);
      };
      const po = new PerformanceObserver((list) => {
        const es = list.getEntries();
        if (es.length) last = es[es.length - 1] as LargestContentfulPaint;
      });
      try {
        po.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        resolve(null);
        return;
      }
      setTimeout(finish, 150);
    });
    if (!entry) {
      return { ...base, state: "info", detail: capDetail("LCP nije zabeležen") };
    }
    const lcpMs = entry.renderTime || entry.loadTime || entry.startTime;
    const url = entry.url || "";
    const data = {
      lcp_s: sec(lcpMs),
      element: url ? fileName(url) : "(tekst/element)",
      url: url.slice(0, 200),
      sizePx: entry.size,
    };
    // Web Vitals pragovi: <2.5s dobro, 2.5–4s treba popraviti, >4s loše.
    const state: ModuleResult["state"] =
      lcpMs <= 2500 ? "ok" : lcpMs <= 4000 ? "warn" : "fail";
    return {
      ...base,
      ms: Math.round(lcpMs),
      state,
      detail: capDetail(`${data.lcp_s}s · ${data.element}`),
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

/** Resursi: koliko CSS/JS/slika stiglo, ukupna težina, najsporiji + blokator/CSS provera. */
export function collectResources(): ModuleResult {
  const base = { key: "resources", name: "Resursi (CSS/JS/slike)", ms: null };
  try {
    const res = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    let css = 0,
      js = 0,
      img = 0,
      font = 0,
      transfer = 0;
    // Kada je POSLEDNJI CSS/JS resurs završio (responseEnd, od početka
    // navigacije) = "CSS/JS first load u ms".
    let cssEndMs = 0,
      jsEndMs = 0;
    let slowest = { name: "", ms: 0 };
    for (const r of res) {
      transfer += r.transferSize ?? 0;
      const t = r.initiatorType;
      if (t === "css" || t === "link") {
        css++;
        cssEndMs = Math.max(cssEndMs, r.responseEnd);
      } else if (t === "script") {
        js++;
        jsEndMs = Math.max(jsEndMs, r.responseEnd);
      } else if (
        t === "img" ||
        /\.(png|jpe?g|webp|avif|gif)(\?|$)/i.test(r.name)
      )
        img++;
      else if (/\.woff2?(\?|$)|fonts\.g/i.test(r.name)) font++;
      if (r.duration > slowest.ms)
        slowest = { name: fileName(r.name), ms: Math.round(r.duration) };
    }
    cssEndMs = Math.round(cssEndMs);
    jsEndMs = Math.round(jsEndMs);

    // CSS primenjen? (blokiran content-blocker-om → stranica bez stila)
    const cssLoaded =
      typeof document !== "undefined" && document.styleSheets.length > 0;

    // Content/ad blocker bait: ako blokator sakrije .adsbox (display:none) → offsetHeight 0.
    let blockerLikely = false;
    try {
      const bait = document.createElement("div");
      bait.className = "adsbox ad-banner pub_300x250";
      bait.style.cssText =
        "position:absolute;left:-9999px;top:-9999px;height:2px;width:2px";
      document.body.appendChild(bait);
      blockerLikely = bait.offsetHeight === 0;
      document.body.removeChild(bait);
    } catch {
      /* ignore */
    }

    const transferKB = Math.round(transfer / 1024);
    const data = {
      css,
      js,
      img,
      font,
      cssLoadMs: cssEndMs,
      jsLoadMs: jsEndMs,
      transferKB,
      cssApplied: cssLoaded,
      jsRunning: true, // ako ovaj kod radi, prvi-party JS se izvršava
      slowest: `${slowest.name} ${slowest.ms}ms`,
      blockerLikely,
    };

    // "Blokirano" = CSS nije primenjen ili nema nijednog script resursa.
    const blocked = !cssLoaded || js === 0;
    const state: ModuleResult["state"] = blocked
      ? "fail"
      : blockerLikely || transfer > 4_000_000
        ? "warn"
        : "ok";
    return {
      ...base,
      state,
      detail: capDetail(
        !cssLoaded
          ? "CSS nije primenjen — verovatno blokiran (content blocker?)"
          : js === 0
            ? "nijedan JS resurs nije učitan — moguća blokada skripti"
            : `CSS ${cssEndMs}ms · JS ${jsEndMs}ms · slike:${img} · ${transferKB}KB · najsporije ${data.slowest}${blockerLikely ? " · blokator aktivan?" : ""}`,
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
