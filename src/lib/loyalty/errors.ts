/**
 * Greške redemption toka — sa kodom koji ruta prevodi u HTTP status.
 *
 * Bez ovoga bi svaki odbijen zahtev bio 500: „nemaš dovoljno poena" i „baza
 * je pala" nisu isti događaj, a klijentkinja mora da vidi razliku.
 */
export type LoyaltyErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID"
  | "CONFLICT";

export class LoyaltyRedemptionError extends Error {
  constructor(
    readonly code: LoyaltyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LoyaltyRedemptionError";
  }
}

const STATUS_BY_CODE: Record<LoyaltyErrorCode, 400 | 403 | 404 | 409> = {
  INVALID: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

export function loyaltyErrorStatus(error: LoyaltyRedemptionError): number {
  return STATUS_BY_CODE[error.code];
}
