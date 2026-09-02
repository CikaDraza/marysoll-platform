import { describe, expect, it } from "vitest";
import {
  getPlanFeatures,
  resolveActiveFeatureOverrides,
  resolveEffectivePlan,
} from "./planFeatures";

describe("shared Salon Statistics and Client 360 gate", () => {
  it("uses the statistics feature for both surfaces", () => {
    expect(getPlanFeatures("maria").statistics).toBe(false);
    expect(getPlanFeatures("claudia").statistics).toBe(true);
    expect(getPlanFeatures("kiki").statistics).toBe(true);
    expect(getPlanFeatures("enterprise").statistics).toBe(true);
  });

  it("honours the canonical statistics override", () => {
    expect(getPlanFeatures("maria", { statistics: true }).statistics).toBe(true);
    expect(getPlanFeatures("kiki", { statistics: false }).statistics).toBe(false);
  });

  it("allows an active Superadmin statistics override on unpaid Maria", () => {
    const now = new Date("2026-09-02T12:00:00.000Z");
    const subscription = {
      plan: "maria" as const,
      status: "expired",
      featureOverrides: { statistics: true },
      overrideExpiresAt: "2026-09-10T00:00:00.000Z",
    };
    const effectivePlan = resolveEffectivePlan(
      subscription,
      { plan: "maria", paid: false },
      now,
    );
    const overrides = resolveActiveFeatureOverrides(subscription, now);
    expect(effectivePlan).toBe("maria");
    expect(getPlanFeatures(effectivePlan, overrides).statistics).toBe(true);
  });
});
