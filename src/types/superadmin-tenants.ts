import { z } from "zod";

const tenantRowSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  subdomain: z.string(),
  cloudinaryFolder: z.string(),
  customDomain: z.string().nullable(),
  status: z.enum(["active", "suspended", "pending", "cancelled"]),
  plan: z.enum(["maria", "claudia", "kiki", "enterprise"]),
  paid: z.boolean(),
  verified: z.boolean(),
  isTrialActive: z.boolean(),
  trialEndsAt: z.string().nullable(),
  trialDaysLeft: z.number().nullable(),
  planExpiresAt: z.string().nullable(),
  createdAt: z.string(),
  lemonsqueezyCustomerId: z.string().nullable(),
  lemonsqueezySubscriptionId: z.string().nullable(),
  overrideNote: z.string().nullable(),
  isDemo: z.boolean(),
  logo: z.string().nullable(),
  landingTheme: z.string().nullable(),
  hasWorkingHours: z.boolean(),
  servicesCount: z.number().int().nonnegative(),
  clientCount: z.number().int().nonnegative(),
  owner: z.object({
    _id: z.string(),
    name: z.string(),
    email: z.string(),
    isEmailVerified: z.boolean(),
    createdAt: z.string(),
  }).nullable(),
});

export const superAdminTenantsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(tenantRowSchema),
});

export type TenantRow = z.infer<typeof tenantRowSchema>;
