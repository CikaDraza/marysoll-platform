"use client";

/**
 * Banner koji se prikaže kada je sajt otvoren u in-app pregledaču (Instagram,
 * Facebook, Messenger, TikTok) — Metin in-app browser blokira admin.marysoll.com
 * pa prijava vlasnicama ne radi, a korisnice ne znaju da nađu "Open in external
 * browser" opciju.
 *
 * Dugme pokušava da PREBACI korisnika u pravi browser jednim tapom:
 *   - iOS:  `x-safari-https://...` šema otvara link u pravom Safariju
 *   - Android: `intent://...` otvara default browser (Chrome)
 * Ako šema ne prođe (stariji OS, Meta je blokirala), ostaje uputstvo za ⋯ meni.
 *
 * Prikazuje se SAMO na platformskim hostovima (marysoll.com, admin., superadmin.)
 * — na tenant sajtovima zakazivanje kroz in-app browser radi i ne treba im
 * nikakva prepreka.
 *
 * Za ručno testiranje bez Instagrama: dodati ?inapp=test u URL.
 */

import { useEffect, useState } from "react";
import { detectInApp, isPlatformHost } from "@/lib/browser-detect";

export function InAppBrowserBanner() {
  const [appName, setAppName] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    // setTimeout: detekcija je jednokratna, a lint zabranjuje sinhroni setState u efektu
    const t = setTimeout(() => {
      const ua = navigator.userAgent;
      const testMode = window.location.search.includes("inapp=test");
      try {
        if (!testMode && sessionStorage.getItem("inapp_banner_dismissed")) {
          return;
        }
      } catch {
        /* ignore */
      }
      const detected = testMode ? "Instagram" : detectInApp(ua);
      if (detected && (testMode || isPlatformHost(window.location.hostname))) {
        setAppName(detected);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!appName) return null;

  const openInBrowser = () => {
    setTried(true);
    const url = window.location.href.replace(/([?&])inapp=test(&|$)/, "$1");
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      // x-safari- šema otvara pravi Safari iz in-app pregledača (iOS 17+)
      window.location.href = `x-safari-${url}`;
    } else {
      const { host, pathname, search } = window.location;
      window.location.href = `intent://${host}${pathname}${search}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
    }
  };

  const dismiss = () => {
    try {
      sessionStorage.setItem("inapp_banner_dismissed", "1");
    } catch {
      /* ignore */
    }
    setAppName(null);
  };

  return (
    <div className="sticky top-0 z-[100] bg-violet-700 text-white px-4 py-3 shadow-lg">
      <div className="max-w-3xl mx-auto flex flex-col gap-2 relative pr-8">
        <button
          onClick={dismiss}
          aria-label="Zatvori"
          className="absolute -top-1 right-0 p-1 text-violet-200 hover:text-white text-lg leading-none"
        >
          ✕
        </button>
        <p className="text-sm font-semibold leading-snug">
          Otvorili ste sajt u {appName} pregledaču — prijava u njemu ne radi
          ispravno.
        </p>
        <button
          onClick={openInBrowser}
          className="w-full sm:w-auto self-start rounded-lg bg-white text-violet-700 text-sm font-bold px-4 py-2 hover:bg-violet-50 transition"
        >
          Otvori u mom pregledaču →
        </button>
        {tried && (
          <p className="text-xs text-violet-200 leading-snug">
            Ako se ništa nije desilo: dodirnite <strong>⋯</strong> (tri tačke u
            uglu ekrana) pa izaberite{" "}
            <strong>„Otvori u spoljnom pregledaču&rdquo;</strong> / „Open in
            external browser&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
