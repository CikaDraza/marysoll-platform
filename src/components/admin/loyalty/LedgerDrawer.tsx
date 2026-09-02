"use client";

import { useLoyaltyAdminLedger } from "@/hooks/loyalty/useLoyaltyAdminAccounts";
import { useSalonProfile } from "@/hooks/useSalonProfile";
import { clientNounCap } from "@/lib/clientWording";
import type { LoyaltyAdminAccount } from "@/types/loyalty-admin";

type LedgerData = ReturnType<typeof useLoyaltyAdminLedger>["data"];

function LedgerContent({ data, isLoading }: { data: LedgerData; isLoading: boolean }) {
  if (isLoading) return <div className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse h-32" />;
  if (!data?.entries.length) return <p className="text-xs text-gray-400 text-center py-8">Nema knjiženja.</p>;
  return <ul className="divide-y divide-gray-100 dark:divide-gray-800">{data.entries.map((entry) => <li key={entry._id} className="py-2.5 flex justify-between gap-4"><div className="min-w-0"><p className="text-sm text-gray-800 dark:text-gray-200 truncate">{entry.description}</p><p className="text-[11px] text-gray-400">{new Date(entry.createdAt).toLocaleString("sr-RS")} · {entry.entryType}</p></div><span className={`text-sm font-black flex-shrink-0 ${entry.amount > 0 ? "text-emerald-600" : "text-rose-500"}`}>{entry.amount > 0 ? "+" : ""}{entry.amount} {entry.currency === "hearts" ? "❤️" : "⭐"}</span></li>)}</ul>;
}

export function LedgerDrawer({ account, onClose }: { account: LoyaltyAdminAccount; onClose: () => void }) {
  const { data, isLoading } = useLoyaltyAdminLedger(account._id);
  const clientGender = useSalonProfile().data?.clientGender;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-screen overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">Istorija — {account.client?.name ?? clientNounCap(clientGender)}</h3>
        <LedgerContent data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}
