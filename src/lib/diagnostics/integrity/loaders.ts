import "server-only";

/**
 * Memoizovani per-tenant read-only upiti koje deli više provera (users 6×,
 * accounts 4×, ledger 2×) — jedan run = jedno učitavanje. Ako upit padne,
 * SVAKA provera koja ga čeka dobija svoj failedResult sa stvarnim razlogom
 * (memoizovan rejected promise) — nikad tiho "0 problema".
 *
 * Id-jevi se normalizuju u stringove ovde, da čista logika (classify.ts)
 * ne zna za ObjectId.
 */

import { TenantUser } from "@/models/TenantUser";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import {
  buildUserIndex,
  type UserIndex,
  type UserIndexRow,
} from "./classify";

export interface AccountRow {
  _id: string;
  tenantUserId: string;
  heartsBalance: number;
  pointsBalance: number;
}

export interface LedgerRow {
  accountId: string;
  tenantUserId: string;
  currency: string;
  amount: number;
}

export interface IntegrityLoaders {
  users(): Promise<UserIndexRow[]>;
  index(): Promise<UserIndex>;
  accounts(): Promise<AccountRow[]>;
  ledger(): Promise<LedgerRow[]>;
}

function memo<T>(fn: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => (cached ??= fn());
}

export function createLoaders(tenantId: string): IntegrityLoaders {
  const users = memo(async (): Promise<UserIndexRow[]> => {
    const rows = await TenantUser.find({ tenantId })
      .select("role status mergedInto phone name")
      .lean();
    return (rows as Record<string, unknown>[]).map((r) => ({
      _id: String(r._id),
      role: String(r.role ?? ""),
      status: String(r.status ?? ""),
      mergedInto: r.mergedInto ? String(r.mergedInto) : null,
      phone: r.phone ? String(r.phone) : undefined,
      name: r.name ? String(r.name) : undefined,
    }));
  });

  const index = memo(async () => buildUserIndex(await users()));

  const accounts = memo(async (): Promise<AccountRow[]> => {
    const rows = await LoyaltyAccount.find({ tenantId })
      .select("tenantUserId heartsBalance pointsBalance")
      .lean();
    return (rows as Record<string, unknown>[]).map((r) => ({
      _id: String(r._id),
      tenantUserId: String(r.tenantUserId ?? ""),
      heartsBalance: Number(r.heartsBalance) || 0,
      pointsBalance: Number(r.pointsBalance) || 0,
    }));
  });

  const ledger = memo(async (): Promise<LedgerRow[]> => {
    const rows = await LoyaltyLedger.find({ tenantId })
      .select("accountId tenantUserId currency amount")
      .lean();
    return (rows as Record<string, unknown>[]).map((r) => ({
      accountId: String(r.accountId ?? ""),
      tenantUserId: String(r.tenantUserId ?? ""),
      currency: String(r.currency ?? ""),
      amount: Number(r.amount) || 0,
    }));
  });

  return { users, index, accounts, ledger };
}
