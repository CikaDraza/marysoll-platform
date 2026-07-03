"use client";

/**
 * Error boundary za /dashboard segment.
 *
 * Dva posla:
 *  1. Chunk-load greške (stari deploy u browseru traži chunk koji više ne
 *     postoji, pad mreže usred dynamic import-a): JEDNOM automatski osveži
 *     stranicu — svež HTML donosi važeće chunk URL-ove. sessionStorage guard
 *     sprečava reload petlju; ako i posle reload-a pukne, prikazuje ekran.
 *  2. Svaka druga runtime greška: prijateljski ekran umesto belog/mrtvog,
 *     sa dugmetom za osvežavanje — i beacon sa porukom/stackom u DiagReport
 *     (label "dash-boundary") da grešku vidimo i bez pristupa uređaju.
 */

import { useEffect } from "react";
import { sendDiagBeacon } from "@/lib/diag-beacon";

const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk .* failed|dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported/i;

const RELOAD_GUARD_KEY = "dash_chunk_reload_done";

export default function DashboardError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const isChunkError = CHUNK_ERROR_RE.test(`${error.name} ${error.message}`);

  useEffect(() => {
    sendDiagBeacon("dash-boundary", {
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
            ? "Učitavamo novu verziju aplikacije…"
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
