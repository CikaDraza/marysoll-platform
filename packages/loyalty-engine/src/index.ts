/**
 * @panta/loyalty-engine — javni API (Phase 0: čista domenska logika).
 *
 * Obračun popusta vaučera, generisanje kodova, format valute (deklinacija).
 * Bez baze/Next/React — DB/IO (accounts, ledger, events, vouchers/service,
 * cron) ostaje u Marysoll app-u i konzumira ovaj paket kroz adapter
 * lib/platform/loyalty-client.ts.
 *
 * QR/streak i Referral Phase 2b čista pravila su izdvojeni; DB/IO orkestracija
 * ostaje u app adapterima. Sledeće: Phase 3 premium pravila i dodatni
 * multi-consumer Loyalty Moments eventi (vidi ARHITEKTURA-ENGINES.md).
 */

export type { CurrencyNames } from "./currency";
export { formatCurrencyAmount } from "./currency";

export type { IdLike, VoucherDiscountInput, DiscountService } from "./pricing";
export { computeVoucherDiscount } from "./pricing";

export { generateVoucherCode, VOUCHER_PREFIX_BY_ORIGIN } from "./codes";

export type {
  StreakState,
  StreakUpdateOptions,
  StreakUpdateResult,
} from "./streak";
export { computeStreakUpdate } from "./streak";

export type {
  ReferralCompletionGateInput,
  ReferralCompletionGateReason,
  ReferralCompletionGateResult,
} from "./referral";
export { evaluateReferralCompletion } from "./referral";
