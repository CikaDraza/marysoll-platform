/**
 * @panta/loyalty-engine — javni API (Phase 0: čista domenska logika).
 *
 * Obračun popusta vaučera, generisanje kodova, format valute (deklinacija).
 * Bez baze/Next/React — DB/IO (accounts, ledger, events, vouchers/service,
 * cron) ostaje u Marysoll app-u i konzumira ovaj paket kroz adapter
 * lib/platform/loyalty-client.ts.
 *
 * Sledeće faze (vidi ARHITEKTURA-ENGINES.md): QR check-in + streak,
 * referral/share voucher, event bus (multi-consumer Loyalty Moments).
 */

export type { CurrencyNames } from "./currency";
export { formatCurrencyAmount } from "./currency";

export type { IdLike, VoucherDiscountInput, DiscountService } from "./pricing";
export { computeVoucherDiscount } from "./pricing";

export { generateVoucherCode, VOUCHER_PREFIX_BY_ORIGIN } from "./codes";
