// ─── Growth Studio: generisanje voucher kodova ────────────────────────────────
// Bez "server-only" — čist util, pokriven unit testovima.

import crypto from "crypto";

// Bez vizuelno dvosmislenih znakova (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateVoucherCode(prefix?: string): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return prefix ? `${prefix}-${code}` : code;
}

export const VOUCHER_PREFIX_BY_ORIGIN: Record<string, string | undefined> = {
  gift: "GIFT",
  referral: "REF",
};
