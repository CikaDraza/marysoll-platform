import { describe, expect, it } from "vitest";
import { evaluateReferralCompletion } from "./referral";

const valid = {
  referrerClientId: "referrer",
  referredClientId: "friend",
  referredRole: "USER",
  isEmailVerified: true,
  voucherOrigin: "gift",
  appointmentUsesVoucher: true,
  priorCompletedVisits: 0,
};

describe("evaluateReferralCompletion", () => {
  it("dozvoljava register + gift booking + prvu završenu posetu", () => {
    expect(evaluateReferralCompletion(valid)).toEqual({ eligible: true });
  });

  it.each([
    [{ referrerClientId: null }, "missing_referrer"],
    [{ referrerClientId: "friend" }, "self_referral"],
    [{ referredRole: "GUEST" }, "not_registered"],
    [{ isEmailVerified: false }, "email_not_verified"],
    [{ voucherOrigin: "manual" }, "not_gift_voucher"],
    [{ appointmentUsesVoucher: false }, "voucher_not_used"],
    [{ priorCompletedVisits: 1 }, "not_first_completed_visit"],
  ] as const)("odbija %s", (override, reason) => {
    expect(evaluateReferralCompletion({ ...valid, ...override })).toEqual({
      eligible: false,
      reason,
    });
  });
});
