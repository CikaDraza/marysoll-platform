import { describe, expect, it } from "vitest";
import { getPlanFeatures } from "@/lib/plans/planFeatures";
import {
  isClientInsightsVisible,
  splitClientAppointments,
  testimonialApprovalLabel,
  voucherRewardLabel,
  voucherStatusLabel,
} from "./presentation";

describe("Client 360 presentation policy", () => {
  it("hides unavailable statistics and follows the shared salon statistics gate", () => {
    expect(isClientInsightsVisible(getPlanFeatures("maria").statistics)).toBe(false);
    expect(isClientInsightsVisible(getPlanFeatures("claudia").statistics)).toBe(true);
    expect(isClientInsightsVisible(getPlanFeatures("kiki").statistics)).toBe(true);
    expect(isClientInsightsVisible(getPlanFeatures("maria", { statistics: true }).statistics)).toBe(true);
  });

  it.each([
    ["active", "Aktivan"],
    ["reserved", "Rezervisan"],
    ["redeemed", "Iskorišćen"],
  ])("presents voucher status %s", (status, label) => {
    expect(voucherStatusLabel(status)).toBe(label);
  });

  it("presents voucher rewards without changing voucher lifecycle", () => {
    expect(voucherRewardLabel({ type: "percent", value: 20, serviceName: "" })).toBe("20% popusta");
    expect(voucherRewardLabel({ type: "fixed", value: 1000, serviceName: "" })).toBe("1.000,00 RSD popusta");
    expect(voucherRewardLabel({ type: "free_service", value: 0, serviceName: "Manikir" })).toBe("Gratis: Manikir");
  });

  it("presents testimonial moderation status read-only", () => {
    expect(testimonialApprovalLabel(true)).toBe("Odobrena");
    expect(testimonialApprovalLabel(false)).toBe("Čeka odobrenje");
  });

  it("separates only future active appointments from previous appointments", () => {
    const item = (id: string, date: string, status: string) => ({
      id: id.repeat(24), serviceName: "Manikir", date, time: "10:00", status,
      potentialValue: 1000, realizedValue: null,
      price: { mode: "fixed" as const, amount: 1000, label: "1.000,00 RSD", detail: null },
      request: null,
    });
    const groups = splitClientAppointments([
      item("a", "2026-09-05", "pending"),
      item("b", "2026-09-06", "completed"),
      item("c", "2026-08-31", "pending"),
    ], new Date("2026-09-02T12:00:00"));

    expect(groups.next.map(({ id }) => id)).toEqual(["a".repeat(24)]);
    expect(groups.previous.map(({ id }) => id)).toEqual(["b".repeat(24), "c".repeat(24)]);
  });
});
