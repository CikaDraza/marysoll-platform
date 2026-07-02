import "server-only";

// ─── Growth Studio: loyalty nalozi ────────────────────────────────────────────

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import type { LoyaltyAccountLean } from "./types";

export async function getOrCreateAccount(
  tenantId: Types.ObjectId | string,
  tenantUserId: Types.ObjectId | string,
): Promise<LoyaltyAccountLean> {
  await connectToDB();
  const account = await LoyaltyAccount.findOneAndUpdate(
    { tenantId, tenantUserId },
    { $setOnInsert: { tenantId, tenantUserId } },
    { new: true, upsert: true },
  ).lean<LoyaltyAccountLean>();
  return account!;
}

/**
 * Rekonsilijacija: preračuna balans iz ledger-a (izvor istine) i upiše ga
 * u keširana polja naloga. Koristi je noćni cron i admin "preračunaj" akcija.
 */
export async function recomputeAccount(
  accountId: Types.ObjectId | string,
): Promise<{ heartsBalance: number; pointsBalance: number } | null> {
  await connectToDB();
  const sums = await LoyaltyLedger.aggregate([
    { $match: { accountId: new Types.ObjectId(String(accountId)) } },
    { $group: { _id: "$currency", total: { $sum: "$amount" } } },
  ]);
  const hearts = sums.find((s) => s._id === "hearts")?.total ?? 0;
  const points = sums.find((s) => s._id === "points")?.total ?? 0;
  const updated = await LoyaltyAccount.findByIdAndUpdate(
    accountId,
    { $set: { heartsBalance: hearts, pointsBalance: points } },
    { new: true },
  ).lean<LoyaltyAccountLean>();
  if (!updated) return null;
  return { heartsBalance: hearts, pointsBalance: points };
}
