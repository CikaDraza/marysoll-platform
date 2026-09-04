import "server-only";

// ─── Growth Studio: append-only knjiženje ─────────────────────────────────────
// Jedina tačka kroz koju se menjaju balansi. Idempotency key čini ponovno
// knjiženje no-op-om; balans na nalogu je keš održavan $inc-om.

import { Types, type ClientSession } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import type { LoyaltyCurrency, LoyaltyEntryType } from "./types";

export interface PostLedgerEntryParams {
  tenantId: Types.ObjectId | string;
  accountId: Types.ObjectId | string;
  tenantUserId: Types.ObjectId | string;
  entryType: LoyaltyEntryType;
  currency: LoyaltyCurrency;
  /** Označen iznos (earn > 0, redeem/revoke < 0) */
  amount: number;
  source: {
    eventId?: Types.ObjectId | string;
    ruleId?: string;
    ruleVersion?: number;
    voucherId?: Types.ObjectId | string;
    appointmentId?: Types.ObjectId | string;
    adminUserId?: Types.ObjectId | string;
    reason?: string;
  };
  idempotencyKey: string;
  description: string;
  /** Dnevni cap za pozitivne earn unose (iz config.antiAbuse); 0/undefined = bez capa */
  maxPerDay?: number;
}

export interface PostLedgerEntryResult {
  /** Stvarno proknjižen iznos (posle clamp-ova); 0 = ništa nije knjiženo */
  applied: number;
  duplicate: boolean;
}

export async function postLedgerEntry(
  params: PostLedgerEntryParams,
): Promise<PostLedgerEntryResult> {
  await connectToDB();

  let amount = Math.trunc(params.amount);
  if (amount === 0) return { applied: 0, duplicate: false };

  const balanceField =
    params.currency === "hearts" ? "heartsBalance" : "pointsBalance";
  const lifetimeField =
    params.currency === "hearts" ? "lifetimeHearts" : "lifetimePoints";

  // Negativni unosi: balans nikad ispod nule — clamp na raspoloživo.
  // (Mala trka read→write je prihvaćena: negativno knjiže samo admin/no-show
  // putanje, nikad konkurentno za isti nalog.)
  if (amount < 0) {
    const account = await LoyaltyAccount.findById(params.accountId)
      .select(balanceField)
      .lean<Record<string, number>>();
    const balance = account?.[balanceField] ?? 0;
    amount = Math.max(amount, -balance);
    if (amount === 0) return { applied: 0, duplicate: false };
  }

  // Anti-abuse dnevni cap za earn unose.
  if (amount > 0 && params.entryType === "earn" && params.maxPerDay) {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const todayAgg = await LoyaltyLedger.aggregate([
      {
        $match: {
          accountId: new Types.ObjectId(String(params.accountId)),
          currency: params.currency,
          entryType: "earn",
          createdAt: { $gte: dayStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const earnedToday = todayAgg[0]?.total ?? 0;
    amount = Math.min(amount, Math.max(0, params.maxPerDay - earnedToday));
    if (amount === 0) return { applied: 0, duplicate: false };
  }

  try {
    await insertLedgerEntry({ ...params, amount });
  } catch (err: unknown) {
    if (isDuplicateLedgerKey(err)) {
      return { applied: 0, duplicate: true };
    }
    throw err;
  }

  const inc: Record<string, number> = { [balanceField]: amount };
  if (amount > 0 && params.entryType === "earn") {
    inc[lifetimeField] = amount;
  }
  await LoyaltyAccount.findByIdAndUpdate(params.accountId, { $inc: inc });

  return { applied: amount, duplicate: false };
}

/** Unique {tenantId, idempotencyKey} — isti događaj se ne knjiži dvaput. */
export function isDuplicateLedgerKey(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}

/**
 * Sirov upis jednog ledger reda — bez clamp-a, bez dnevnog capa i bez
 * diranja balansa na nalogu.
 *
 * Postoji da bi SVI ledger upisi ostali u ovom fajlu. Koristi ga
 * `postLedgerEntry` i points-shop redemption, koji balans menja sam
 * (uslovni `$inc` sa `pointsBalance >= cost`) i zato ne sme da prođe kroz
 * read→clamp putanju: clamp bi tiho proknjižio manji iznos od naplaćenog.
 *
 * Baca E11000 kod duplikata — pozivalac odlučuje da li je to greška ili
 * idempotentan retry.
 */
export async function insertLedgerEntry(
  params: Omit<PostLedgerEntryParams, "maxPerDay">,
  session?: ClientSession,
): Promise<void> {
  const doc = {
    tenantId: params.tenantId,
    accountId: params.accountId,
    tenantUserId: params.tenantUserId,
    entryType: params.entryType,
    currency: params.currency,
    amount: params.amount,
    source: params.source,
    idempotencyKey: params.idempotencyKey,
    description: params.description,
  };
  // `create([doc], { session })` je jedini oblik koji Mongoose vezuje za
  // transakciju; `create(doc, { session })` tiho ispada iz sesije.
  await LoyaltyLedger.create([doc], session ? { session } : {});
}
