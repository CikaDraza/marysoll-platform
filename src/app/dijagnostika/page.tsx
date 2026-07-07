"use client";

/**
 * /dijagnostika — samouslužna dijagnostika za netehničke korisnike.
 *
 * Korisnica samo otvori link (sa marysoll.com koji joj radi); stranica sama
 * izvrši per-host network probes + collectore uređaja (device/push/storage/
 * permissions — sve iz @panta/diagnostic-engine kroz diagnostic-client
 * adapter), izmeri vremena i POST-uje rezultat u bazu (/api/public/diag-report)
 * zajedno sa IP/UA. Pregled: superadmin /api/superadmin/diag-reports.
 *
 * Web ne može DNS lookup/ping/traceroute (iOS to daje samo native app-ovima) —
 * ali per-host reachability sa uređaja je dovoljna da se vidi KOJI host je
 * blokiran i da li je blokada u browser sloju ili šire.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildNetworkProbes,
  runNetworkProbe,
  runCollectors,
  type ModuleResult,
} from "@/lib/platform/diagnostic-client";

const BASE = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

export default function DijagnostikaPage() {
  const [results, setResults] = useState<ModuleResult[]>([]);
  const [phase, setPhase] = useState<"running" | "done">("running");
  const [sent, setSent] = useState<"sending" | "sent" | "failed" | null>(null);
  const startedRef = useRef(false);

  const runAll = useCallback(async () => {
    setPhase("running");
    setSent(null);
    const probes = buildNetworkProbes(BASE);
    setResults(probes);

    const done: ModuleResult[] = [];
    for (const p of probes) {
      const result = await runNetworkProbe(p);
      done.push(result);
      setResults((prev) =>
        prev.map((x) => (x.key === result.key ? result : x)),
      );
    }

    // Collectori uređaja (device/push/storage/permissions) — brzi, bez mreže
    const collected = await runCollectors();
    done.push(...collected);
    setResults((prev) => [...prev, ...collected]);
    setPhase("done");

    // Automatski pošalji rezultate — korisnik ne mora ništa da radi
    setSent("sending");
    try {
      const label =
        new URLSearchParams(window.location.search).get("u") ?? null;
      const res = await fetch("/api/public/diag-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          pageHost: window.location.host,
          results: done,
        }),
      });
      setSent(res.ok ? "sent" : "failed");
    } catch {
      setSent("failed");
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runAll();
  }, [runAll]);

  const adminProbe = results.find((p) => p.key === "admin");
  const baseProbe = results.find((p) => p.key === "base");
  const showAdminBlocked =
    phase === "done" &&
    adminProbe?.state === "fail" &&
    baseProbe?.state === "ok";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-1">
          Marysoll dijagnostika
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          {phase === "running"
            ? "Proveravamo vezu i uređaj… sačekajte par sekundi."
            : "Provera je završena."}
        </p>

        <ul className="space-y-2 mb-5">
          {results.map((p) => (
            <li
              key={p.key}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"
            >
              <span className="text-sm text-gray-700">{p.name}</span>
              <span className="flex items-center gap-2 text-sm">
                {p.ms !== null && (
                  <span className="text-[11px] text-gray-400">{p.ms} ms</span>
                )}
                {p.state === "pending" && (
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
                )}
                {p.state === "ok" && (
                  <span className="text-emerald-600 font-bold">✓</span>
                )}
                {p.state === "info" && (
                  <span
                    className="text-sky-500 font-bold"
                    title={p.detail ?? undefined}
                  >
                    ℹ
                  </span>
                )}
                {p.state === "warn" && (
                  <span
                    className="text-amber-500 font-bold"
                    title={p.detail ?? undefined}
                  >
                    ⚠
                  </span>
                )}
                {p.state === "fail" && (
                  <span
                    className="text-red-500 font-bold"
                    title={p.detail ?? undefined}
                  >
                    ✗
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {showAdminBlocked && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800 mb-4">
            Vaš uređaj ne može da se poveže na admin deo sajta, iako internet i
            glavni sajt rade. To obično znači da neka aplikacija ili
            podešavanje na telefonu blokira pristup — naš tim je dobio
            rezultate i javiće vam se sa rešenjem.
          </div>
        )}

        {phase === "done" && (
          <p className="text-xs text-gray-400 mb-4">
            {sent === "sent" &&
              "✓ Rezultati su automatski poslati našem timu. Možete zatvoriti stranicu."}
            {sent === "sending" && "Šaljemo rezultate…"}
            {sent === "failed" &&
              "Slanje rezultata nije uspelo — pošaljite screenshot ovog ekrana."}
          </p>
        )}

        <button
          onClick={() => void runAll()}
          disabled={phase === "running"}
          className="w-full rounded-lg bg-violet-600 text-white text-sm font-semibold py-2.5 hover:bg-violet-700 disabled:opacity-50 transition"
        >
          Ponovi proveru
        </button>
      </div>
    </div>
  );
}
