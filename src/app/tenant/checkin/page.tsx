"use client";

/**
 * /checkin (tenant domen) — QR check-in landing (Phase 1, samo ulogovani).
 * Klijent skenira QR salona → auto POST /api/loyalty/checkin → prikaz rezultata
 * (streak + poeni). Neulogovan (401) → poziv na prijavu. Publish ide na platform
 * Event Bus; Loyalty subscriber beleži streak/poene (vidi lib/platform/subscribers).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useClientRouting } from "@/hooks/useClientRouting";

type Phase = "checking" | "done" | "unauth" | "inactive" | "error";

interface CheckinResult {
  currentStreak: number;
  longestStreak: number;
  pointsBalance: number;
  heartsBalance: number;
}

export default function CheckinPage() {
  const { base } = useClientRouting();
  const [phase, setPhase] = useState<Phase>("checking");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const startedRef = useRef(false);

  const runCheckin = useCallback(async () => {
    setPhase("checking");
    try {
      const res = await fetch("/api/loyalty/checkin", { method: "POST" });
      if (res.status === 401) {
        setPhase("unauth");
        return;
      }
      if (res.status === 400) {
        setPhase("inactive");
        return;
      }
      if (!res.ok) {
        setPhase("error");
        return;
      }
      setResult((await res.json()) as CheckinResult);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runCheckin();
  }, [runCheckin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-violet-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
        {phase === "checking" && (
          <>
            <div className="mx-auto mb-4 w-10 h-10 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
            <p className="text-sm text-gray-500">Beležimo vaš dolazak…</p>
          </>
        )}

        {phase === "done" && result && (
          <>
            <div className="text-4xl mb-2">👋</div>
            <h1 className="text-xl font-bold text-gray-800 mb-1">
              Dobrodošli!
            </h1>
            <p className="text-sm text-gray-500 mb-5">Dolazak je zabeležen.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-violet-50 py-3">
                <p className="text-2xl font-black text-violet-700">
                  {result.currentStreak}
                </p>
                <p className="text-xs text-gray-500">niz poseta 🔥</p>
              </div>
              <div className="rounded-xl bg-pink-50 py-3">
                <p className="text-2xl font-black text-pink-600">
                  {result.pointsBalance}
                </p>
                <p className="text-xs text-gray-500">poena ⭐</p>
              </div>
            </div>
            {result.longestStreak > result.currentStreak && (
              <p className="mt-3 text-xs text-gray-400">
                Vaš rekord: {result.longestStreak} poseta
              </p>
            )}
          </>
        )}

        {phase === "unauth" && (
          <>
            <div className="text-4xl mb-2">🔒</div>
            <h1 className="text-lg font-bold text-gray-800 mb-1">
              Prijavite se
            </h1>
            <p className="text-sm text-gray-500 mb-5">
              Da bismo zabeležili dolazak i dodelili poene, prijavite se na svoj
              nalog.
            </p>
            <a
              href={`${base}/login?return=${encodeURIComponent(`${base}/checkin`)}`}
              className="inline-block rounded-lg bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-violet-700 transition"
            >
              Prijava
            </a>
          </>
        )}

        {phase === "inactive" && (
          <>
            <div className="text-4xl mb-2">💤</div>
            <p className="text-sm text-gray-500">
              Program vernosti trenutno nije aktivan u ovom salonu.
            </p>
          </>
        )}

        {phase === "error" && (
          <>
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-sm text-gray-500 mb-4">
              Nešto nije uspelo. Pokušajte ponovo.
            </p>
            <button
              onClick={() => void runCheckin()}
              className="rounded-lg bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-violet-700 transition"
            >
              Ponovi
            </button>
          </>
        )}
      </div>
    </div>
  );
}
