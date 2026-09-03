/**
 * Loyalty Client — platformski adapter za @panta/loyalty-engine.
 *
 * App uvozi ČISTU loyalty domensku logiku (obračun popusta, kodovi, format
 * valute) SAMO odavde — isti obrazac kao tenant/identity/diagnostic klijenti.
 * DB/IO loyalty logika (accounts, ledger, events, vouchers/service, cron) i
 * dalje živi u src/lib/loyalty/ i konzumira paket kroz ovaj adapter.
 *
 * Phase 0 (extraction, bez promene ponašanja). Sutra: engine servis.
 */
export {
  formatCurrencyAmount,
  computeVoucherDiscount,
  generateVoucherCode,
  VOUCHER_PREFIX_BY_ORIGIN,
  computeStreakUpdate,
  evaluateReferralCompletion,
  isVoucherApplicableToService,
  computeBenefitPricing,
  evaluatePointsShopOffer,
  pointsShopIdempotencyKey,
  UNKNOWN_BENEFIT_PRICING,
} from "@panta/loyalty-engine";

export type {
  CurrencyNames,
  IdLike,
  VoucherDiscountInput,
  DiscountService,
  StreakState,
  StreakUpdateOptions,
  StreakUpdateResult,
  ReferralCompletionGateInput,
  ReferralCompletionGateReason,
  ReferralCompletionGateResult,
  PointsShopOfferInput,
  BenefitPricing,
  PointsShopEligibility,
} from "@panta/loyalty-engine";
