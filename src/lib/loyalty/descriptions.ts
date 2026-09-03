/**
 * Srpski opis nagrade — jedan tekst za ledger, notifikacije, admin i klijenta.
 *
 * Namerno u zasebnom modulu, bez `server-only` i bez DB importa: koriste ga i
 * `engine.ts` i `redemption.ts`, pa bi zajednički dom u engine-u napravio
 * ciklus.
 */
import type { RewardSpec } from "./types";

export function describeReward(
  reward: Pick<RewardSpec, "type" | "value"> & {
    serviceName?: string;
    /** Ostala polja `RewardSpec`-a se ignorišu — opis ih ne koristi. */
    expiresDays?: number;
  },
): string {
  if (reward.type === "percent") return `${reward.value}% popusta`;
  if (reward.type === "fixed") return `${reward.value} RSD popusta`;
  return `Gratis: ${reward.serviceName || "usluga"}`;
}
