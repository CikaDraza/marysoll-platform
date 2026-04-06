/**
 * FeatureGate — UI komponenta za zaštitu feature-a prema planu.
 *
 * Korišćenje:
 *   <FeatureGate feature="statistics">
 *     <StatisticsPage />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="aiAssistant" requiredPlan="pro">
 *     <AIPanel />
 *   </FeatureGate>
 *
 *   // Custom fallback
 *   <FeatureGate feature="newsletterCampaigns" fallback={<MyUpgradePrompt />}>
 *     <CampaignEditor />
 *   </FeatureGate>
 *
 *   // Inline check (bez UI wrappera)
 *   <FeatureGate feature="statistics" inline>
 *     {(allowed) => (
 *       <button disabled={!allowed}>Statistika</button>
 *     )}
 *   </FeatureGate>
 */
"use client";

import { type ReactNode } from "react";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import type { PlanFeatures, PlanName } from "@/lib/plans/planFeatures";
import {
  PLAN_DISPLAY_NAMES,
  PLAN_BADGE_COLORS,
} from "@/lib/plans/planFeatures";
import Link from "next/link";

// ─── Upgrade prompt (default fallback) ───────────────────────────────────────

const FEATURE_LABELS: Partial<Record<keyof PlanFeatures, string>> = {
  statistics: "Statistika salona",
  newsletterCampaigns: "Newsletter kampanje",
  newsletterLanding: "Newsletter landing stranice",
  aiAssistant: "AI asistent za zakazivanje",
  aiImageGeneration: "AI generisanje slika",
  aiSeoGeneration: "AI SEO optimizacija",
  aiEmailTemplates: "AI email templati",
  aiLandingPages: "AI landing stranice",
  aiMarketingAnalysis: "AI marketing analiza",
  paymentIntegration: "Sistem plaćanja",
  loyaltySystem: "Loyalty bodovi",
  clientSubscriptions: "Pretplate klijenata",
  customTheme: "Custom tema",
  socialMediaAds: "Social media ads",
  googleBusinessOptimization: "Google Business optimizacija",
  videoCreation: "Kreiranje videa",
  aeoGeoOptimization: "AEO/GEO optimizacija",
};

const FEATURE_TO_MIN_PLAN: Partial<Record<keyof PlanFeatures, PlanName>> = {
  statistics: "starter",
  newsletterCampaigns: "starter",
  newsletterLanding: "starter",
  newsletterStats: "starter",
  customTheme: "starter",
  aiAssistant: "pro",
  aiImageGeneration: "pro",
  aiSeoGeneration: "pro",
  aiEmailTemplates: "pro",
  aiLandingPages: "pro",
  aiMarketingAnalysis: "pro",
  paymentIntegration: "pro",
  loyaltySystem: "pro",
  clientSubscriptions: "pro",
  socialMediaAds: "enterprise",
  googleBusinessOptimization: "enterprise",
  videoCreation: "enterprise",
  aeoGeoOptimization: "enterprise",
  unlimitedAiTokens: "enterprise",
};

function DefaultUpgradePrompt({
  feature,
  requiredPlan,
}: {
  feature: keyof PlanFeatures;
  requiredPlan?: PlanName;
}) {
  const featureLabel = FEATURE_LABELS[feature] ?? String(feature);
  const minPlan = requiredPlan ?? FEATURE_TO_MIN_PLAN[feature] ?? "starter";
  const planLabel = PLAN_DISPLAY_NAMES[minPlan];
  const badgeColor = PLAN_BADGE_COLORS[minPlan];

  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 p-8 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl">
        🔒
      </div>

      <div>
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-300 mb-1">
          {featureLabel}
        </p>
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
          Ova funkcionalnost nije dostupna na vašem trenutnom planu.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Dostupno od plana:</span>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}
        >
          {planLabel}
        </span>
      </div>

      <Link
        href="/dashboard?tab=pretplata"
        className="text-xs font-semibold text-violet-600 hover:text-violet-800 underline underline-offset-2 transition"
      >
        Unapredi plan →
      </Link>
    </div>
  );
}

// ─── FeatureGate ─────────────────────────────────────────────────────────────

interface FeatureGateProps {
  /** Feature koji se provjerava */
  feature: keyof PlanFeatures;
  /** Djeca koja se renderuju ako je feature dostupan */
  children: ReactNode | ((allowed: boolean) => ReactNode);
  /** Custom fallback umjesto defaultnog upgrade prompta */
  fallback?: ReactNode;
  /** Minimalni plan (za prikaz u upgrade promptu) */
  requiredPlan?: PlanName;
  /**
   * inline mode — uvijek renderuje djecu, ali proslijeđuje `allowed` boolean.
   * Korisno za disabled stanje dugmadi.
   */
  inline?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  requiredPlan,
  inline = false,
}: FeatureGateProps) {
  const { hasFeature, isLoading } = usePlanFeatures();

  // Inline mode — uvijek renderuje, proslijeđuje allowed
  if (inline) {
    if (typeof children === "function") {
      return <>{children(!isLoading && hasFeature(feature))}</>;
    }
    return <>{children}</>;
  }

  // Loading state — ništa ne prikazuj (izbjegava flash)
  if (isLoading) {
    return (
      <div className="rounded-2xl bg-zinc-50 dark:bg-gray-800 animate-pulse h-32" />
    );
  }

  // Feature dostupan — renderuj sadržaj
  if (hasFeature(feature)) {
    return <>{typeof children === "function" ? children(true) : children}</>;
  }

  // Feature nije dostupan — fallback ili default upgrade prompt
  return (
    <>
      {fallback ?? (
        <DefaultUpgradePrompt feature={feature} requiredPlan={requiredPlan} />
      )}
    </>
  );
}
