"use client";

/**
 * Error boundary za javni sajt salona (/tenant/* segment).
 *
 * Do sada javni sajt NIJE imao boundary: kad klijentski JS pukne na nečijem
 * uređaju (support: "učita se samo roze pozadina, ništa drugo"), ostajao je
 * mrtav ekran, bez ikakve prijave nama. Sada radi isto kao /dashboard:
 *  1. Chunk-load greške (stari deploy u browseru traži chunk koji više ne
 *     postoji): JEDNOM automatski osveži — svež HTML nosi važeće chunk URL-ove.
 *     sessionStorage guard sprečava reload petlju.
 *  2. Svaka druga runtime greška: prijateljski ekran umesto mrtve pozadine +
 *     beacon (label "site-boundary") sa porukom/stackom u DiagReport, da grešku
 *     vidimo i bez pristupa uređaju.
 */

import { useEffect } from "react";
import { sendDiagBeacon } from "@/lib/platform/diagnostic-client";

const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk .* failed|dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported/i;

const RELOAD_GUARD_KEY = "site_chunk_reload_done";

export default function TenantSiteError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const isChunkError = CHUNK_ERROR_RE.test(`${error.name} ${error.message}`);

  useEffect(() => {
    sendDiagBeacon("site-boundary", {
      name: error.name,
      message: error.message.slice(0, 500),
      digest: error.digest ?? null,
      stack: error.stack?.slice(0, 1500) ?? null,
      chunkError: isChunkError,
    });

    if (isChunkError) {
      try {
        if (!sessionStorage.getItem(RELOAD_GUARD_KEY)) {
          sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
          window.location.reload();
        }
      } catch {
        /* sessionStorage nedostupan — bez auto-reload-a, ostaje dugme */
      }
    }
  }, [error, isChunkError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🔄</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          {isChunkError
            ? "Učitavamo novu verziju stranice…"
            : "Došlo je do greške pri učitavanju"}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {isChunkError
            ? "Ako se stranica ne osveži sama, dodirnite dugme ispod."
            : "Greška je automatski prijavljena našem timu. Pokušajte da osvežite stranicu."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-violet-600 text-white text-sm font-semibold px-6 py-2.5 hover:bg-violet-700 transition"
        >
          Osveži stranicu
        </button>
      </div>
    </div>
  );
}
