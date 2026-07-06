"use client";

/**
 * UpgradePlans — kartice planova (Maria / Claudia / Kiki) u "pretplata" tabu.
 * Plaćeni planovi pokreću Paddle hosted checkout:
 *   POST /api/paddle/checkout { plan } → redirect na checkoutUrl.
 * tenant_id se NE šalje sa frontenda — backend ga uzima iz JWT-a.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, publicApi } from "@/lib/api";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import {
  PLAN_FEATURES,
  PLAN_DISPLAY_NAMES,
  type PlanName,
} from "@/lib/plans/planFeatures";

// Planovi koji se nude i redosled prikaza
const DISPLAY_PLANS: PlanName[] = ["maria", "claudia", "kiki"];
// Planovi koji idu kroz Paddle checkout (imaju cenu)
const PAID_PLANS: PlanName[] = ["claudia", "kiki"];

interface PlanDoc {
  name: string;
  slug: PlanName;
  description: string;
  priceMonthly: number;
  isHighlighted: boolean;
}

function fmtLimit(value: number, unit: string): string {
  if (value === -1) return "Neograničeno";
  return unit ? `${value} ${unit}` : String(value);
}

/** Kratak izvod ključnih mogućnosti po planu (iz PLAN_FEATURES). */
function planHighlights(slug: PlanName): string[] {
  const f = PLAN_FEATURES[slug];
  return [
    `${fmtLimit(f.staffMembers, "zaposlenih")}`,
    `${fmtLimit(f.dbStorageGb, "GB")} prostora za podatke`,
    f.statistics ? "Statistika i analitika" : "Osnovni pregled",
    f.aiAssistant
      ? "AI asistent i automatizacija"
      : f.newsletterCampaigns
        ? "Newsletter kampanje"
        : "Email newsletter",
  ];
}

export function UpgradePlans() {
  const { data: status } = usePlanStatus();
  const currentPlan = status?.plan;

  const { data: plans, isLoading } = useQuery<PlanDoc[]>({
    queryKey: ["plans"],
    queryFn: async () => (await publicApi.get<PlanDoc[]>("/public/plans")).data,
    staleTime: 5 * 60 * 1000,
  });

  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-start checkout kad marketing CTA dovede vlasnika sa `?startCheckout=<plan>`
  // (klik na plaćeni plan na marysoll.com/pricing → ovde se odmah pokreće Paddle).
  const searchParams = useSearchParams();
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    const startPlan = searchParams.get("startCheckout");
    if (startPlan && PAID_PLANS.includes(startPlan as PlanName)) {
      autoStartedRef.current = true;
      void handleSelect(startPlan as PlanName);
    }
    // ref garantuje jednokratno okidanje; namerno zavisimo samo od searchParams.
  }, [searchParams]);

  // Skrol do kartica sa planovima kad se dođe sa `#planovi` (npr. CTA sa marketinga).
  // Tab-promena je client-side pa browser ne skroluje na hash sam — radimo ručno.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#planovi") {
      return;
    }
    document
      .getElementById("planovi")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function handleSelect(slug: PlanName) {
    setError(null);
    setLoadingPlan(slug);
    try {
      const res = await api.post<{ transactionId: string }>(
        "/paddle/checkout",
        { plan: slug },
      );

      // Redirect na /checkout na apex domenu (marysoll.com) — Paddle live checkout
      // je odobren samo za taj domen, ne i za admin.marysoll.com. Auth je već
      // odrađen (POST iznad), a /checkout stranica ne zahteva JWT — čita samo
      // _ptxn i returnTo iz URL-a i otvara Paddle.js overlay.
      // Na localhost-u (dev) ostani na istom origin-u — nema domain approval-a.
      const host = window.location.hostname;
      const isLocal = host === "localhost" || host.startsWith("127.");
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
      const checkoutBase = isLocal ? window.location.origin : `https://${baseDomain}`;
      // Baza povratka — /checkout stranica sama dodaje checkout=success (uspeh) ili
      // checkout=cancelled (zatvaranje bez plaćanja).
      const returnTo = `${window.location.origin}/dashboard?tab=pretplata`;
      window.location.assign(
        `${checkoutBase}/checkout?_ptxn=${encodeURIComponent(res.data.transactionId)}&returnTo=${encodeURIComponent(returnTo)}`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri pokretanju plaćanja. Pokušajte ponovo.";
      setError(msg);
      setLoadingPlan(null);
    }
  }

  // Mapiraj fetch-ovane planove po slug-u i poređaj po DISPLAY_PLANS
  const bySlug = new Map((plans ?? []).map((p) => [p.slug, p]));
  const cards = DISPLAY_PLANS.map((slug) => bySlug.get(slug)).filter(
    (p): p is PlanDoc => Boolean(p),
  );

  return (
    <div id="planovi" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Planovi
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Unapredite plan da otključate više mogućnosti.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="admin-card h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {cards.map((plan) => {
            const isCurrent = currentPlan === plan.slug;
            const isPaid = PAID_PLANS.includes(plan.slug);
            const highlighted = plan.isHighlighted;

            return (
              <div
                key={plan.slug}
                className={`admin-card flex flex-col p-6 ${
                  highlighted ? "ring-2 ring-violet-500" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {PLAN_DISPLAY_NAMES[plan.slug]}
                  </h3>
                  {highlighted && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                      Popularno
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {plan.priceMonthly === 0 ? "0€" : `${plan.priceMonthly}€`}
                  </span>
                  <span className="text-xs text-gray-400">/ mesečno</span>
                </div>

                {plan.description && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {plan.description}
                  </p>
                )}

                <ul className="mt-4 flex-1 space-y-2">
                  {planHighlights(plan.slug).map((h) => (
                    <li
                      key={h}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-green-500">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full cursor-default rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-400 dark:border-gray-700 dark:bg-gray-800/50"
                    >
                      Trenutni plan
                    </button>
                  ) : isPaid ? (
                    <button
                      onClick={() => handleSelect(plan.slug)}
                      disabled={loadingPlan !== null}
                      className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-95 disabled:opacity-60"
                    >
                      {loadingPlan === plan.slug
                        ? "Pokrećem plaćanje..."
                        : "Izaberi plan"}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full cursor-default rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-400 dark:border-gray-700 dark:bg-gray-900"
                    >
                      Besplatan plan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
