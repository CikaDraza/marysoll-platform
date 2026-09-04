/**
 * @panta/payments-engine — javni API (Faza 1: čista domenska logika).
 *
 * Kompozicija iznosa, poravnanje računa i pravila depozita. Bez baze, Next-a i
 * React-a — DB/IO orkestracija živi u Marysoll app-u i konzumira ovaj paket
 * kroz adapter `lib/platform/payments-client.ts`, isti obrazac kao Loyalty.
 *
 * Provajder naplate NIJE deo ovog paketa i namerno ne postoji: Faza 1 radi sa
 * `provider: "manual"` (salon beleži keš/uplatu), pa se ceo domen dokazuje pre
 * nego što ijedan novac prođe kroz treću stranu.
 */

export { toMinor, toMajor, isValidChargeAmount } from "./money";

export type { AppointmentSettlement, LedgerAmount } from "./settlement";
export { netCaptured, settleAppointment, violatesChargedFloor } from "./settlement";

export type {
  DepositTrigger,
  DepositRuleConfig,
  DepositEvaluationInput,
  DepositEvaluation,
  DepositOutcome,
} from "./deposit";
export { evaluateDeposit, depositOutcomeForPhase } from "./deposit";
