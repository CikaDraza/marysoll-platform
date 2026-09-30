import { describe, expect, it } from "vitest";
import { PLAN_FEATURES } from "@/lib/plans/planFeatures";
import { buildTenantResourceUsage } from "@/lib/plans/resourceQuotas";
import { planStatusDataSchema } from "@/types/plan-status";

describe("tenant plan-status response contract", () => {
  it("keeps tenant quota data and strips global or cross-tenant fields", () => {
    const resourceUsage = buildTenantResourceUsage({
      plan: "claudia",
      mongoUsageMb: 2,
      cloudinaryUsageMb: 50,
      updatedAt: "2026-08-13T19:43:01.657Z",
      baseline: { mongoMb: 2, cloudinaryMb: 50 },
    });

    const parsed = planStatusDataSchema.parse({
      name: "Tenant",
      plan: "claudia",
      status: "active",
      isTrialActive: false,
      trialEndsAt: null,
      planExpiresAt: null,
      aiSettings: {
        chatEnabled: false,
        landingEnabled: false,
        imageEnabled: false,
        chatRpmLimit: 10,
        landingRpmLimit: 5,
        imageRpmLimit: 3,
      },
      resourceUsage: {
        ...resourceUsage,
        calibration: { mongoMb: 2, cloudinaryMb: 50 },
      },
      features: PLAN_FEATURES.claudia,
      globalMongoLimitMb: 512,
      globalCloudinaryLimitGb: 25,
      platformCapacity: 204,
      otherTenants: [{ tenantId: "other" }],
    });

    expect(parsed.resourceUsage.mongo.quotaMb).toBe(4);
    expect(parsed.resourceUsage.cloudinary.quotaMb).toBe(100);
    expect(parsed).not.toHaveProperty("globalMongoLimitMb");
    expect(parsed).not.toHaveProperty("globalCloudinaryLimitGb");
    expect(parsed).not.toHaveProperty("platformCapacity");
    expect(parsed).not.toHaveProperty("otherTenants");
    expect(parsed.resourceUsage).not.toHaveProperty("calibration");
  });
});
