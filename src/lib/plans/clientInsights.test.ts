import { describe, expect, it } from "vitest";
import { getPlanFeatures, planHasFeature } from "./planFeatures";

describe("Client 360 plan gate", () => {
  it("is off for Maria and Claudia, on for Kiki and Enterprise", () => {
    expect(planHasFeature("maria", "clientInsights")).toBe(false);
    expect(planHasFeature("claudia", "clientInsights")).toBe(false);
    expect(planHasFeature("kiki", "clientInsights")).toBe(true);
    expect(planHasFeature("enterprise", "clientInsights")).toBe(true);
  });

  it("honours active feature overrides through the canonical resolver", () => {
    expect(getPlanFeatures("maria", { clientInsights: true }).clientInsights).toBe(true);
    expect(getPlanFeatures("kiki", { clientInsights: false }).clientInsights).toBe(false);
  });
});
