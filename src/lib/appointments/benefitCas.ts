import type { Types } from "mongoose";

/**
 * Compare-and-set uslov za pogodnost nad kojom je izracunata cena termina.
 *
 * Odsustvo pogodnosti mora da pokrije i `null` i nepostojece polje: stare
 * termine i `$unset` putanju. Svaki write koji prethodno racuna iznos nad
 * `appliedVoucherId` mora da nosi ovaj filter, inace moze da upise aritmetiku
 * vaucera V1 preko termina koji je u medjuvremenu dobio V2.
 */
export function benefitCasFilter(
  expectedVoucherId: Types.ObjectId | null | undefined,
): Record<string, unknown> {
  return expectedVoucherId
    ? { appliedVoucherId: expectedVoucherId }
    : { appliedVoucherId: { $in: [null, undefined] } };
}
