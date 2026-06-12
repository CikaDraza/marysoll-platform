/**
 * lib/ai/agents/seoAgentLandingTheme.ts
 *
 * Shared SEO context/result types for tenant landing analysis.
 * The analysis itself now runs through the shared SEO core
 * (src/lib/ai/agents/seo/analyzeSeo.ts).
 *
 * API key: process.env.API_KEY_SEO_LADNING_THEME
 */
import type { LandingStructure } from "@/types";
import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";

export interface SeoCmsServiceContext {
  name?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  basePrice?: number | null;
  priceMode?: string;
  duration?: number | null;
  priceFrom?: number | null;
  durationFrom?: number | null;
  hasPriceOnRequest?: boolean;
  type?: string;
  variants?: {
    name?: string;
    price?: number | null;
    priceMode?: string;
    duration?: number | null;
  }[];
  groupedServices?: {
    name?: string;
    price?: number | null;
    priceMode?: string;
    duration?: number | null;
    description?: string;
  }[];
}

export interface SeoCmsContext {
  salon?: {
    name?: string;
    city?: string;
    street?: string;
  };
  services?: SeoCmsServiceContext[];
  workingHours?: unknown;
  platformKnowledge?: {
    servicesPreviewHasCatalogWidget?: boolean;
    servicesPageHasFullCatalogPricesDurationsAndBookingLinks?: boolean;
    appointmentSectionHasBookingWidget?: boolean;
    appointmentsPageHasBookingCalendarServiceSelectionAndWorkingHours?: boolean;
    testimonialsContentComesFromDatabase?: boolean;
  };
}

export interface SeoLandingAnalysisInput {
  landingStructure: LandingStructure;
  seoContext?: SeoCmsContext;
  renderedSnapshot?: LandingRenderSnapshot;
  crawlUrl?: string;
  crawlError?: string;
}

export interface SeoLandingAnalysisOutput {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
  snapshotSource?: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
}
