import type { ReactNode } from "react";
import type { ClientOverview } from "@/types/client-overview";
import type { LoyaltyAdminAccount } from "@/types/loyalty-admin";
import { AdjustModal } from "@/components/admin/loyalty/AdjustModal";
import { ClientOverviewSection } from "./ClientOverviewSection";
import { formatClientMoney } from "./formatters";
import { voucherRewardLabel, voucherStatusLabel } from "./presentation";

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

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("sr-RS") : "—";
}

function LoyaltyMetrics({ account }: { account: NonNullable<ClientOverview["loyalty"]["account"]> }) {
  const metrics = [
    ["Hearts", `${account.heartsBalance} ❤️`],
    ["Points", `${account.pointsBalance} ⭐`],
    ["Završene posete", account.completedVisits],
    ["Ukupna potrošnja", formatClientMoney(account.totalSpend)],
    ["Nedolasci", account.noShows],
  ] as const;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800"><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="mt-1 font-bold text-gray-900 dark:text-gray-100">{value}</p></div>)}</div>;
}

function VoucherAppointment({ voucher }: { voucher: NonNullable<ClientOverview["loyalty"]["vouchers"]>[number] }) {
  const details: Record<string, ReactNode> = {
    reserved: <>Rezervisan: {voucher.reservedAppointmentId ?? "—"}</>,
    redeemed: <>Iskorišćen {formatDate(voucher.redeemedAt)}<br />Termin: {voucher.redeemedAppointmentId ?? "—"}</>,
  };
  return <>{details[voucher.status] ?? "—"}</>;
}

function LoyaltyVouchers({ vouchers }: { vouchers: ClientOverview["loyalty"]["vouchers"] }) {
  if (!vouchers?.length) return <p className="text-sm text-gray-500">Nema aktivnih, rezervisanih ni iskorišćenih vaučera.</p>;
  return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700"><thead className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"><tr><th className="px-3 py-2">Kod</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Nagrada</th><th className="px-3 py-2">Isticanje</th><th className="px-3 py-2">Termin</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{vouchers.map((voucher) => <tr key={voucher.id}><td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{voucher.code}</td><td className="whitespace-nowrap px-3 py-2">{voucherStatusLabel(voucher.status)}</td><td className="whitespace-nowrap px-3 py-2">{voucherRewardLabel(voucher)}</td><td className="whitespace-nowrap px-3 py-2">{formatDate(voucher.expiresAt)}</td><td className="min-w-52 px-3 py-2 text-xs text-gray-500 dark:text-gray-400"><VoucherAppointment voucher={voucher} /></td></tr>)}</tbody></table></div>;
}

function LoyaltyLedger({ ledger }: { ledger: ClientOverview["loyalty"]["ledger"] }) {
  if (!ledger?.length) return <p className="text-sm text-gray-500">Nema ledger događaja.</p>;
  return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700"><thead className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"><tr><th className="px-3 py-2">Datum</th><th className="px-3 py-2">Događaj</th><th className="px-3 py-2 text-right">Promena</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{ledger.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap px-3 py-2 text-gray-500">{formatDate(entry.createdAt)}</td><td className="px-3 py-2">{entry.description}</td><td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${entry.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{entry.amount > 0 ? "+" : ""}{entry.amount} {entry.currency === "hearts" ? "hearts" : "points"}</td></tr>)}</tbody></table></div>;
}

function LoyaltyAccountContent({ loyalty, onAdjustOpen }: { loyalty: ClientOverview["loyalty"]; onAdjustOpen: () => void }) {
  const account = loyalty.account;
  if (!account) return <p className="text-sm text-gray-500">Klijent još nema loyalty nalog.</p>;
  return <div className="space-y-5"><LoyaltyMetrics account={account} /><button onClick={onAdjustOpen} className="text-sm font-bold text-violet-600 hover:underline">Koriguj balans</button><section className="space-y-2"><h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Vaučeri</h4><LoyaltyVouchers vouchers={loyalty.vouchers} /></section><section className="space-y-2"><h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Poslednji ledger događaji</h4><LoyaltyLedger ledger={loyalty.ledger} /></section></div>;
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
