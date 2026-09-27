import { describe, expect, it } from "vitest";
import {
  getPlanFeatures,
  isValidPlanLimit,
  resolveActiveFeatureOverrides,
  resolveEffectivePlan,
} from "./planFeatures";

describe("canonical plan limits", () => {
  it.each([-1, 0, 1, 3, 10])("prihvata validan limit %s", (limit) => {
    expect(isValidPlanLimit(limit)).toBe(true);
  });

  it.each([-2, 1.5, Number.NaN, "3", null, undefined])(
    "odbija nevalidan limit %s",
    (limit) => {
      expect(isValidPlanLimit(limit)).toBe(false);
    },
  );

  it("aktivni superadmin override menja staffMembers bez promene plana", () => {
    const now = new Date("2026-09-27T06:00:00.000Z");
    const subscription = {
      plan: "maria" as const,
      status: "expired",
      featureOverrides: { staffMembers: 3 },
      overrideExpiresAt: "2026-10-01T00:00:00.000Z",
    };

    const plan = resolveEffectivePlan(
      subscription,
      { plan: "maria", paid: false },
      now,
    );
    const overrides = resolveActiveFeatureOverrides(subscription, now);

    expect(plan).toBe("maria");
    expect(getPlanFeatures(plan, overrides).staffMembers).toBe(3);
  });

  it("istekao override ne menja staffMembers", () => {
    const now = new Date("2026-09-27T06:00:00.000Z");
    const overrides = resolveActiveFeatureOverrides(
      {
        featureOverrides: { staffMembers: 3 },
        overrideExpiresAt: "2026-09-20T00:00:00.000Z",
      },
      now,
    );

    expect(getPlanFeatures("maria", overrides).staffMembers).toBe(1);
  });
});
