/**
 * Čist Referral Phase 2b hard-gate. App sloj učitava stanje iz baze, a ovaj
 * evaluator odlučuje da li je referral zaista zatvoren: registrovan i
 * verifikovan klijent, gift vaučer na njegovom prvom završenom terminu i bez
 * self-referral-a.
 */

export interface ReferralCompletionGateInput {
  referrerClientId: string | null;
  referredClientId: string;
  referredRole: string;
  isEmailVerified: boolean;
  voucherOrigin: string;
  appointmentUsesVoucher: boolean;
  priorCompletedVisits: number;
}

export type ReferralCompletionGateReason =
  | "missing_referrer"
  | "self_referral"
  | "not_registered"
  | "email_not_verified"
  | "not_gift_voucher"
  | "voucher_not_used"
  | "not_first_completed_visit";

export type ReferralCompletionGateResult =
  | { eligible: true }
  | { eligible: false; reason: ReferralCompletionGateReason };

export function evaluateReferralCompletion(
  input: ReferralCompletionGateInput,
): ReferralCompletionGateResult {
  if (!input.referrerClientId) {
    return { eligible: false, reason: "missing_referrer" };
  }
  if (input.referrerClientId === input.referredClientId) {
    return { eligible: false, reason: "self_referral" };
  }
  if (input.referredRole !== "USER") {
    return { eligible: false, reason: "not_registered" };
  }
  if (!input.isEmailVerified) {
    return { eligible: false, reason: "email_not_verified" };
  }
  if (input.voucherOrigin !== "gift") {
    return { eligible: false, reason: "not_gift_voucher" };
  }
  if (!input.appointmentUsesVoucher) {
    return { eligible: false, reason: "voucher_not_used" };
  }
  if (input.priorCompletedVisits > 0) {
    return { eligible: false, reason: "not_first_completed_visit" };
  }
  return { eligible: true };
}
