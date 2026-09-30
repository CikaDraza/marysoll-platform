import { z } from "zod";
import type { PlanFeatures } from "@/lib/plans/planFeatures";
import {
  planNameSchema,
  tenantResourceUsageSchema,
} from "@/types/resource-quota";

export const planFeaturesSchema = z.object({
  dbStorageGb: z.number().finite(),
  aiRequestsPerMonth: z.number().int(),
  newsletterSubscribers: z.number().int(),
  staffMembers: z.number().int(),
  customDomain: z.boolean(),
  appointments: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  testimonials: z.boolean(),
  landingThemes: z.array(z.string()),
  customTheme: z.boolean(),
  newsletter: z.boolean(),
  newsletterCampaigns: z.boolean(),
  newsletterLanding: z.boolean(),
  statistics: z.boolean(),
  clientInsights: z.boolean(),
  newsletterStats: z.boolean(),
  aiAssistant: z.boolean(),
  aiImageGeneration: z.boolean(),
  aiSeoGeneration: z.boolean(),
  aiEmailTemplates: z.boolean(),
  aiLandingPages: z.boolean(),
  aiMarketingAnalysis: z.boolean(),
  paymentIntegration: z.boolean(),
  loyaltyCore: z.boolean(),
  loyaltySystem: z.boolean(),
  loyaltyRevenue: z.boolean(),
  clientSubscriptions: z.boolean(),
  emailCampaignAi: z.boolean(),
  socialMediaAds: z.boolean(),
  googleBusinessOptimization: z.boolean(),
  videoCreation: z.boolean(),
  aeoGeoOptimization: z.boolean(),
  unlimitedAiTokens: z.boolean(),
  trialDays: z.number().int().nonnegative(),
  maxSalons: z.number().int(),
  statisticsLevel: z.enum(["none", "basic", "full", "ai"]),
  newsletterLevel: z.enum(["none", "email", "landing"]),
}) satisfies z.ZodType<PlanFeatures>;

export const planStatusDataSchema = z.object({
  name: z.string(),
  plan: planNameSchema,
  status: z.enum(["active", "suspended", "pending", "cancelled"]),
  isTrialActive: z.boolean(),
  trialEndsAt: z.iso.datetime().nullable(),
  planExpiresAt: z.iso.datetime().nullable(),
  aiSettings: z.object({
    chatEnabled: z.boolean(),
    landingEnabled: z.boolean(),
    imageEnabled: z.boolean(),
    chatRpmLimit: z.number().int().nonnegative(),
    landingRpmLimit: z.number().int().nonnegative(),
    imageRpmLimit: z.number().int().nonnegative(),
  }),
  resourceUsage: tenantResourceUsageSchema,
  features: planFeaturesSchema,
});

export type PlanStatusData = z.infer<typeof planStatusDataSchema>;
