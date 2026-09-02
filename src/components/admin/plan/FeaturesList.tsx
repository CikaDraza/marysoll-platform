"use client";

import {
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import type { PlanFeatures } from "@/lib/plans/planFeatures";

interface FeaturesListProps {
  features: PlanFeatures;
}

const FEATURE_LABELS: Partial<Record<keyof PlanFeatures, string>> = {
  // Core
  appointments: "Zakazivanje termina",
  emailNotifications: "Email notifikacije",
  pushNotifications: "Push notifikacije",
  testimonials: "Recenzije klijenata",
  customDomain: "Custom domen",
  customTheme: "Custom tema",
  // Newsletter
  newsletter: "Newsletter slanje",
  newsletterCampaigns: "Newsletter kampanje",
  newsletterLanding: "Landing stranice za kampanje",
  newsletterStats: "Newsletter statistika",
  clientInsights: "Napredni Client 360 uvid",
  // AI
  aiAssistant: "AI asistent za zakazivanje",
  aiImageGeneration: "AI generisanje slika",
  aiSeoGeneration: "AI SEO optimizacija",
  aiEmailTemplates: "AI email templati",
  aiLandingPages: "AI landing stranice",
  aiMarketingAnalysis: "AI marketing analiza",
  emailCampaignAi: "AI email kampanje",
  // Enterprise
  socialMediaAds: "Social media oglasi",
  googleBusinessOptimization: "Google Business optimizacija",
  videoCreation: "Kreiranje videa",
  aeoGeoOptimization: "AEO / GEO optimizacija",
  unlimitedAiTokens: "Neograničeni AI tokeni",
};

const FEATURE_GROUPS: {
  label: string;
  keys: (keyof PlanFeatures)[];
}[] = [
  {
    label: "Core",
    keys: [
      "appointments",
      "emailNotifications",
      "pushNotifications",
      "testimonials",
      "customDomain",
      "customTheme",
    ],
  },
  {
    label: "Newsletter",
    keys: [
      "newsletter",
      "newsletterCampaigns",
      "newsletterLanding",
      "newsletterStats",
    ],
  },
  {
    label: "AI",
    keys: [
      "aiAssistant",
      "aiImageGeneration",
      "aiSeoGeneration",
      "aiEmailTemplates",
      "aiLandingPages",
      "aiMarketingAnalysis",
      "emailCampaignAi",
    ],
  },
  {
    label: "Enterprise",
    keys: [
      "socialMediaAds",
      "googleBusinessOptimization",
      "videoCreation",
      "aeoGeoOptimization",
      "unlimitedAiTokens",
    ],
  },
];

export function FeaturesList({ features }: FeaturesListProps) {
  return (
    <div className="admin-card p-6">
      <p className="mb-5 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Dostupne funkcionalnosti
      </p>

      <div className="space-y-6">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
              {group.label}
            </p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {group.keys.map((key) => {
                const enabled = Boolean(features[key]);
                const label = FEATURE_LABELS[key] ?? String(key);
                return (
                  <div
                    key={String(key)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  >
                    {enabled ? (
                      <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
                    ) : (
                      <LockClosedIcon className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
                    )}
                    <span
                      className={`text-sm ${
                        enabled
                          ? "text-gray-700 dark:text-gray-200"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
