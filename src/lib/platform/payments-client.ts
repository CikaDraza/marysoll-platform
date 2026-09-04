/**
 * Payments Client — platformski adapter za @panta/payments-engine.
 *
 * App uvozi ČISTU platnu domensku logiku (kompozicija iznosa, poravnanje
 * računa, pravila depozita) SAMO odavde — isti obrazac kao loyalty/tenant/
 * identity klijenti. DB/IO (namere, ledger, provajder) živi u
 * `src/lib/payments/` i konzumira paket kroz ovaj adapter.
 *
 * Faza 1: bez provajdera. `provider: "manual"` je jedini put kojim novac ulazi.
 */
export {
  toMinor,
  toMajor,
  isValidChargeAmount,
  netCaptured,
  settleAppointment,
  violatesChargedFloor,
  evaluateDeposit,
  depositOutcomeForPhase,
} from "@panta/payments-engine";

export type {
  AppointmentSettlement,
  LedgerAmount,
  DepositTrigger,
  DepositRuleConfig,
  DepositEvaluationInput,
  DepositEvaluation,
  DepositOutcome,
} from "@panta/payments-engine";
