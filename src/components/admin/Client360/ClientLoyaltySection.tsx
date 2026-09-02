import Link from "next/link";
import type { ClientOverview } from "@/types/client-overview";
import type { LoyaltyAdminAccount } from "@/types/loyalty-admin";
import { AdjustModal } from "@/components/admin/loyalty/AdjustModal";
import { ClientOverviewSection } from "./ClientOverviewSection";

function modalAccountOf(loyalty: ClientOverview["loyalty"], client: ClientOverview["client"]): LoyaltyAdminAccount | null {
  const account = loyalty.account;
  if (!account) return null;
  return {
    _id: account.id, tenantUserId: client.id, heartsBalance: account.heartsBalance,
    pointsBalance: account.pointsBalance, lifetimeHearts: account.lifetimeHearts,
    lifetimePoints: account.lifetimePoints, completedVisits: account.completedVisits,
    noShows: account.noShows, totalSpend: account.totalSpend,
    lastVisitAt: account.lastVisitAt ?? undefined,
    client: { _id: client.id, name: client.name, email: client.email },
  };
}

function itemCount(items: readonly unknown[] | undefined) { return items?.length ?? 0; }

function LoyaltyAccountContent({ loyalty, onAdjustOpen }: { loyalty: ClientOverview["loyalty"]; onAdjustOpen: () => void }) {
  const account = loyalty.account;
  if (!account) return <p className="text-sm text-gray-500">Klijent još nema loyalty nalog.</p>;
  return <><div className="flex gap-5 text-sm"><strong>{account.heartsBalance} ❤️</strong><strong>{account.pointsBalance} ⭐</strong></div><p className="mt-2 text-xs text-gray-500">Ledger: {itemCount(loyalty.ledger)} stavki · Vaučeri: {itemCount(loyalty.vouchers)}</p><button onClick={onAdjustOpen} className="mt-3 mr-4 text-sm font-bold text-violet-600 hover:underline">Koriguj balans</button><Link href="/dashboard?tab=growth" className="mt-3 inline-block text-sm font-bold text-violet-600 hover:underline">Otvori Growth Studio za korekcije i vaučere →</Link></>;
}

function LoyaltyAdjustModal({ open, account, onClose }: { open: boolean; account: LoyaltyAdminAccount | null; onClose: () => void }) {
  if (!open || !account) return null;
  return <AdjustModal account={account} onClose={onClose} />;
}

export function ClientLoyaltySection({ loyalty, client, adjustOpen, onAdjustOpen, onAdjustClose }: {
  loyalty: ClientOverview["loyalty"];
  client: ClientOverview["client"];
  adjustOpen: boolean;
  onAdjustOpen: () => void;
  onAdjustClose: () => void;
}) {
  if (!loyalty.enabled) return null;
  const modalAccount = modalAccountOf(loyalty, client);
  return <><ClientOverviewSection title="Loyalty"><LoyaltyAccountContent loyalty={loyalty} onAdjustOpen={onAdjustOpen} /></ClientOverviewSection><LoyaltyAdjustModal open={adjustOpen} account={modalAccount} onClose={onAdjustClose} /></>;
}
