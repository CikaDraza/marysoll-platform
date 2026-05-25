/**
 * lib/plans/planFeatures.ts
 *
 * PLAN_FEATURES — jedini izvor istine za sve mogućnosti po planu.
 *
 * Pravilo: svaki feature koji se provjerava u aplikaciji mora biti ovdje.
 * NE duplicirati u Plan MongoDB modelu — Plan model se koristi samo za
 * prikaz pricing stranice (cijena, opisi, LemonSqueezy variant ID-evi).
 *
 * Korišćenje:
 *   Server:  import { getPlanFeatures } from "@/lib/plans/planFeatures"
 *   Client:  import { usePlanFeatures } from "@/hooks/usePlanFeatures"
 *   UI gate: import { FeatureGate } from "@/components/shared/FeatureGate"
 */

export type PlanName = "free" | "starter" | "pro" | "enterprise";

export interface PlanFeatures {
  // ── Limits ────────────────────────────────────────────────────────────────
  /** Veličina baze podataka u GB. -1 = neograničeno */
  dbStorageGb: number;
  /** AI zahtevi po mjesecu. -1 = neograničeno */
  aiRequestsPerMonth: number;
  /** Broj newsletter pretplatnika. -1 = neograničeno */
  newsletterSubscribers: number;
  /** Broj staff članova. -1 = neograničeno */
  staffMembers: number;

  // ── Core ──────────────────────────────────────────────────────────────────
  customDomain: boolean;
  appointments: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  testimonials: boolean;

  // ── Teme i dizajn ─────────────────────────────────────────────────────────
  /** Liste dostupnih built-in tema */
  landingThemes: string[];
  /** Custom tema (prilagodljivi dizajn) */
  customTheme: boolean;

  // ── Newsletter ────────────────────────────────────────────────────────────
  /** Osnovno slanje newslettera */
  newsletter: boolean;
  /** Kreiranje i upravljanje kampanjama */
  newsletterCampaigns: boolean;
  /** SEO-ready landing page za kampanje */
  newsletterLanding: boolean;

  // ── Statistika ────────────────────────────────────────────────────────────
  statistics: boolean;
  newsletterStats: boolean;

  // ── AI funkcionalnosti ────────────────────────────────────────────────────
  /** AI booking asistent i automatizacija */
  aiAssistant: boolean;
  /** Generisanje slika za email i landing page */
  aiImageGeneration: boolean;
  /** AI SEO generisanje i optimizacija metadata */
  aiSeoGeneration: boolean;
  /** Generisanje HTML email templata */
  aiEmailTemplates: boolean;
  /** Kreiranje landing stranica */
  aiLandingPages: boolean;
  /** Analiza statistike i marketing preporuke */
  aiMarketingAnalysis: boolean;

  // ── Plaćanje i loyalty ────────────────────────────────────────────────────
  /** PayPal + LemonSqueezy integracija */
  paymentIntegration: boolean;
  /** Loyalty bodovi za klijente */
  loyaltySystem: boolean;
  /** Mesečna pretplata za klijente salona */
  clientSubscriptions: boolean;

  // ── Enterprise ────────────────────────────────────────────────────────────
  /** Viral social media ads */
  /** AI-powered email campaign creation and management */
  emailCampaignAi: boolean;
  socialMediaAds: boolean;
  /** Google Business Profile optimizacija */
  googleBusinessOptimization: boolean;
  /** Kreiranje video sadržaja */
  videoCreation: boolean;
  /** AEO + GEO optimizacija */
  aeoGeoOptimization: boolean;
  /** Neograničeni AI tokeni */
  unlimitedAiTokens: boolean;

  // ── Trial ─────────────────────────────────────────────────────────────────
  trialDays: number;
  /** Maksimalan broj salona po nalogu. -1 = neograničeno */
  maxSalons: number;
  /** Statistika: "basic" = samo ukupno, "full" = sve karte, "ai" = AI analitika */
  statisticsLevel: "none" | "basic" | "full" | "ai";
  /** Newsletter nivo: "email" = samo email, "landing" = email + landing page */
  newsletterLevel: "none" | "email" | "landing";
}

// ─── Feature definicije po planu ─────────────────────────────────────────────

export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  free: {
    // Limits
    dbStorageGb: 1,
    aiRequestsPerMonth: 0,
    newsletterSubscribers: 100,
    staffMembers: 1,

    // Core
    customDomain: true,
    appointments: true,
    emailNotifications: true,
    pushNotifications: true,
    testimonials: true,

    // Teme
    landingThemes: [
      "theme-1",
      "theme-2",
      "theme-3",
      "theme-4",
      "theme-5",
      "theme-6",
    ],
    customTheme: false,

    // Newsletter
    newsletter: true,
    newsletterCampaigns: false,
    newsletterLanding: false,

    // Statistika
    statistics: false,
    newsletterStats: false,

    // AI
    aiAssistant: false,
    aiImageGeneration: false,
    aiSeoGeneration: false,
    aiEmailTemplates: false,
    aiLandingPages: false,
    aiMarketingAnalysis: false,

    // Plaćanje
    paymentIntegration: false,
    loyaltySystem: false,
    clientSubscriptions: false,

    // Enterprise
    emailCampaignAi: false,
    socialMediaAds: false,
    googleBusinessOptimization: false,
    videoCreation: false,
    aeoGeoOptimization: false,
    unlimitedAiTokens: false,

    trialDays: 14,
    maxSalons: 1,
    statisticsLevel: "none",
    newsletterLevel: "email",
  },

  starter: {
    dbStorageGb: 128,
    aiRequestsPerMonth: 0,
    newsletterSubscribers: 2000,
    staffMembers: 3,

    customDomain: true,
    appointments: true,
    emailNotifications: true,
    pushNotifications: true,
    testimonials: true,

    landingThemes: [
      "theme-1",
      "theme-2",
      "theme-3",
      "theme-4",
      "theme-5",
      "theme-6",
    ],
    customTheme: true,

    newsletter: true,
    newsletterCampaigns: true,
    newsletterLanding: true,

    statistics: true,
    newsletterStats: true,

    aiAssistant: false,
    aiImageGeneration: false,
    aiSeoGeneration: false,
    aiEmailTemplates: false,
    aiLandingPages: false,
    aiMarketingAnalysis: false,

    paymentIntegration: false,
    loyaltySystem: false,
    clientSubscriptions: false,

    emailCampaignAi: false,
    socialMediaAds: false,
    googleBusinessOptimization: false,
    videoCreation: false,
    aeoGeoOptimization: false,
    unlimitedAiTokens: false,

    trialDays: 0,
    maxSalons: 2,
    statisticsLevel: "full",
    newsletterLevel: "email",
  },

  pro: {
    dbStorageGb: 512,
    aiRequestsPerMonth: 5000,
    newsletterSubscribers: 10000,
    staffMembers: 10,

    customDomain: true,
    appointments: true,
    emailNotifications: true,
    pushNotifications: true,
    testimonials: true,

    landingThemes: [
      "theme-1",
      "theme-2",
      "theme-3",
      "theme-4",
      "theme-5",
      "theme-6",
    ],
    customTheme: true,

    newsletter: true,
    newsletterCampaigns: true,
    newsletterLanding: true,

    statistics: true,
    newsletterStats: true,

    aiAssistant: true,
    aiImageGeneration: true,
    aiSeoGeneration: true,
    aiEmailTemplates: true,
    aiLandingPages: true,
    aiMarketingAnalysis: true,

    paymentIntegration: true,
    loyaltySystem: true,
    clientSubscriptions: true,

    emailCampaignAi: false,
    socialMediaAds: false,
    googleBusinessOptimization: false,
    videoCreation: false,
    aeoGeoOptimization: false,
    unlimitedAiTokens: false,

    trialDays: 0,
    maxSalons: 10,
    statisticsLevel: "ai",
    newsletterLevel: "landing",
  },

  enterprise: {
    dbStorageGb: -1,
    aiRequestsPerMonth: -1,
    newsletterSubscribers: -1,
    staffMembers: -1,

    customDomain: true,
    appointments: true,
    emailNotifications: true,
    pushNotifications: true,
    testimonials: true,

    landingThemes: [
      "theme-1",
      "theme-2",
      "theme-3",
      "theme-4",
      "theme-5",
      "theme-6",
    ],
    customTheme: true,

    newsletter: true,
    newsletterCampaigns: true,
    newsletterLanding: true,

    statistics: true,
    newsletterStats: true,

    aiAssistant: true,
    aiImageGeneration: true,
    aiSeoGeneration: true,
    aiEmailTemplates: true,
    aiLandingPages: true,
    aiMarketingAnalysis: true,

    paymentIntegration: true,
    loyaltySystem: true,
    clientSubscriptions: true,

    emailCampaignAi: true,
    socialMediaAds: true,
    googleBusinessOptimization: true,
    videoCreation: true,
    aeoGeoOptimization: true,
    unlimitedAiTokens: true,

    trialDays: 0,
    maxSalons: 10,
    statisticsLevel: "ai",
    newsletterLevel: "landing",
  },
};

// ─── Helper funkcije ──────────────────────────────────────────────────────────

/**
 * Vraća feature konfiguraciju za plan, uz primjenu superadmin override-a.
 * Koristi se server-side u API route-ovima i middleware-u.
 */
export function getPlanFeatures(
  plan: PlanName,
  overrides?: Partial<PlanFeatures> | null,
): PlanFeatures {
  const base = PLAN_FEATURES[plan];
  if (!overrides) return base;
  return { ...base, ...overrides };
}

/**
 * Provjeri da li plan ima konkretan feature.
 * Koristi se za jednostavne boolean provjere.
 */
export function planHasFeature<K extends keyof PlanFeatures>(
  plan: PlanName,
  feature: K,
  overrides?: Partial<PlanFeatures> | null,
): PlanFeatures[K] {
  return getPlanFeatures(plan, overrides)[feature];
}

/**
 * Provjeri da li je limit prekoračen (-1 = neograničeno).
 */
export function isWithinLimit(current: number, limit: number): boolean {
  if (limit === -1) return true;
  return current < limit;
}

/** Naziv plana za prikaz */
export const PLAN_DISPLAY_NAMES: Record<PlanName, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro (Growth)",
  enterprise: "Enterprise",
};

/** Badge boje za plan */
export const PLAN_BADGE_COLORS: Record<PlanName, string> = {
  free: "bg-zinc-100 text-zinc-600",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-violet-100 text-violet-700",
  enterprise: "bg-amber-100 text-amber-700",
};
