"use client";

/**
 * Banner "Dodaj Marysoll na početni ekran" — vodi netehničke korisnike do
 * instalacije PWA, jer sami ne nalaze opciju u meniju browsera.
 *
 * - Android/Chrome: hvata `beforeinstallprompt` i na tap dugmeta otvara PRAVI
 *   sistemski install dijalog (jedan tap, bez traženja po meniju).
 * - iOS: programska instalacija ne postoji (Apple ne da) — prikazuje kratko
 *   uputstvo za Share → „Dodaj na početni ekran". Instalirana iOS web-app
 *   dobija SVOJ ČIST kontejner (kolačići odvojeni od Safari/Chrome).
 *
 * Prikaz: platformski hostovi preko root layouta i tenant sajtovi preko tenant
 * layouta; ne u in-app pregledačima (tamo radi InAppBrowserBanner), niti kada
 * već radi kao PWA. Odbacivanje se pamti u localStorage. Ručni test bez
 * telefona: ?a2hs=test u URL-u.
 */

import { useEffect, useState } from "react";
import {
  detectInApp,
  isPlatformHost,
  isStandalone,
} from "@/lib/browser-detect";

const DISMISS_KEY = "a2hs_dismissed_v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AddToHomeScreenBannerProps {
  audience?: "platform" | "tenant";
  appName?: string;
}

export function AddToHomeScreenBanner({
  audience = "platform",
  appName = "Marysoll",
}: AddToHomeScreenBannerProps = {}) {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const isAllowedHost = () =>
      audience === "tenant" || isPlatformHost(window.location.hostname);

    // Android/Chrome: event stiže samo ako je manifest validan i PWA nije instalirana
    const onPrompt = (e: Event) => {
      if (!isAllowedHost()) return;
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS: nema eventa — prikazujemo uputstvo (odloženo zbog lint pravila o setState u efektu)
    const t = setTimeout(() => {
      try {
        const testMode = window.location.search.includes("a2hs=test");
        if (!testMode) {
          if (localStorage.getItem(DISMISS_KEY)) return;
          if (!isAllowedHost()) return;
          if (detectInApp(navigator.userAgent)) return;
          if (isStandalone()) return;
        }
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isIOS || testMode) setMode((m) => m ?? "ios");
      } catch {
        /* ignore */
      }
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, [audience]);

  if (!mode) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setMode(null);
  };

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === "accepted") setMode(null);
  };

  return (
    <div className="fixed bottom-3 inset-x-3 z-[100] sm:left-auto sm:right-4 sm:w-96">
      <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">📲</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">
              Dodajte {appName} na početni ekran
            </p>
            {mode === "android" ? (
              <p className="text-xs text-gray-500 mt-0.5">
                Otvara se kao aplikacija, jednim dodirom — bez kucanja adrese.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Dodirnite <strong>Share dugme</strong> — kvadrat sa strelicom
                nagore{" "}
                {/CriOS/i.test(
                  typeof navigator === "undefined" ? "" : navigator.userAgent,
                )
                  ? "(u Chrome-u je GORE DESNO, pored adrese)"
                  : "(u Safariju je u DNU ekrana, na sredini)"}{" "}
                — zatim skrolujte dole i izaberite{" "}
                <strong>„Dodaj na početni ekran&rdquo;</strong> / „Add to Home
                Screen&rdquo;. Nije u ⋯ meniju! Dobijate {appName} ikonicu kao
                aplikaciju.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Zatvori"
            className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
          >
            ✕
          </button>
        </div>
        {mode === "android" && (
          <button
            onClick={() => void install()}
            className="mt-3 w-full rounded-lg bg-violet-600 text-white text-sm font-bold py-2.5 hover:bg-violet-700 transition"
          >
            Instaliraj aplikaciju
          </button>
        )}
      </div>
    </div>
  );
}
