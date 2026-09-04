import type { LoyaltyRewardInfo } from "@/hooks/useLoyalty";
import type { LoyaltyConfigLean } from "@/lib/loyalty/types";

export type LoyaltyAdminConfig = Pick<
  LoyaltyConfigLean,
  "enabled" | "currencies" | "milestones" | "pointsShop" | "noShowPolicy" | "autoComplete" | "celebration" | "antiAbuse"
> & {
  currencies: {
    hearts: LoyaltyConfigLean["currencies"]["hearts"];
    points: LoyaltyConfigLean["currencies"]["points"];
  };
  earning: Required<LoyaltyConfigLean["earning"]>;
  streak: Required<NonNullable<LoyaltyConfigLean["streak"]>>;
  sharing: { enabled: boolean; friendReward: LoyaltyRewardInfo; maxActivePerClient: number; referrerRewardPoints: number };
};

export interface LoyaltyAdminAccount {
  _id: string;
  tenantUserId: string;
  heartsBalance: number;
  pointsBalance: number;
  lifetimeHearts: number;
  lifetimePoints: number;
  completedVisits: number;
  noShows: number;
  totalSpend: number;
  lastVisitAt?: string;
  checkinStreak?: number;
  client: { _id: string; name?: string; email?: string; role?: string } | null;
}

export interface LoyaltyAdminLedgerEntry {
  _id: string;
  entryType: string;
  currency: "hearts" | "points";
  amount: number;
  description: string;
  createdAt: string;
  source?: { reason?: string; ruleId?: string };
}

export interface LoyaltyAdminVoucher {
  _id: string;
  code: string;
  type: "percent" | "fixed" | "free_service";
  value: number;
  serviceName?: string;
  origin: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
  owner: { name?: string; email?: string } | null;
}

export interface DuplicateAccount {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isRegistered: boolean;
  createdAt: string | null;
  hearts: number;
  points: number;
  visits: number;
  appointments: number;
}

export interface DuplicateGroup { key: string; accounts: DuplicateAccount[] }

export interface MergeResult {
  ok: boolean;
  alreadyMerged?: boolean;
  moved: { appointments: number; ledger: number; events: number; vouchers: number; notifications: number; testimonials: number; audience: number; referrals: number };
}

export interface MergeAccountSummary {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isRegistered: boolean;
  status: string;
  hearts: number;
  points: number;
  visits: number;
  appointments: number;
  vouchers: number;
}

export interface MergeMoves {
  appointments: number;
  ledgerEntries: number;
  loyaltyEvents: number;
  vouchersOwned: number;
  vouchersGifted: number;
  referralsAsReferrer: number;
  referralsAsReferred: number;
  notifications: number;
  testimonials: number;
  audienceContacts: number;
}

export interface MergePreview {
  allowed: boolean;
  reason?: string;
  source: MergeAccountSummary | null;
  target: MergeAccountSummary | null;
  after: { hearts: number; points: number; visits: number; appointments: number; vouchers: number } | null;
  moves: MergeMoves | null;
  risks: string[];
}
