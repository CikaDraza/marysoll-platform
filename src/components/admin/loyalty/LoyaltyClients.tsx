"use client";

import { useState } from "react";
import { useLoyaltyAdminAccounts } from "@/hooks/loyalty/useLoyaltyAdminAccounts";
import { useSalonProfile } from "@/hooks/useSalonProfile";
import { noShowLabel, clientNounCap } from "@/lib/clientWording";
import type { LoyaltyAdminAccount } from "@/types/loyalty-admin";
import { AdjustModal } from "./AdjustModal";
import { LedgerDrawer } from "./LedgerDrawer";
import { loyaltyCard, loyaltyInput } from "./loyaltyStyles";

export function LoyaltyClients() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useLoyaltyAdminAccounts(query);
  const clientGender = useSalonProfile().data?.clientGender;
  const [ledgerFor, setLedgerFor] = useState<LoyaltyAdminAccount | null>(null);
  const [adjustFor, setAdjustFor] = useState<LoyaltyAdminAccount | null>(null);

  return (
    <div className="space-y-4">
      <input className={`${loyaltyInput} max-w-sm`} placeholder="Pretraga po imenu ili emailu..." value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className={`${loyaltyCard} overflow-x-auto`}>
        {isLoading ? <div className="p-6"><div className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse h-32" /></div> : !data?.accounts.length ? <p className="text-xs text-gray-400 text-center py-10">Još nema loyalty naloga — nastaju automatski prvom nagradom.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-800"><th className="px-5 py-3">{clientNounCap(clientGender)}</th><th className="px-3 py-3">❤️</th><th className="px-3 py-3">⭐</th><th className="px-3 py-3">Posete</th><th className="px-3 py-3">🔥 Niz</th><th className="px-3 py-3">{noShowLabel(clientGender)}</th><th className="px-3 py-3">Potrošnja</th><th className="px-3 py-3" /></tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {data.accounts.map((account) => <tr key={account._id}><td className="px-5 py-3"><p className="font-bold text-gray-900 dark:text-white">{account.client?.name ?? "—"}</p><p className="text-[11px] text-gray-400">{account.client?.email ?? ""}</p></td><td className="px-3 py-3 font-bold">{account.heartsBalance}</td><td className="px-3 py-3 font-bold">{account.pointsBalance}</td><td className="px-3 py-3">{account.completedVisits}</td><td className="px-3 py-3 font-bold">{(account.checkinStreak ?? 0) > 0 ? `🔥 ${account.checkinStreak}` : "—"}</td><td className="px-3 py-3">{account.noShows}</td><td className="px-3 py-3">{account.totalSpend} RSD</td><td className="px-3 py-3 whitespace-nowrap text-right"><button onClick={() => setLedgerFor(account)} className="text-xs font-bold text-violet-600 hover:text-violet-800 mr-3">Istorija</button><button onClick={() => setAdjustFor(account)} className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Korekcija</button></td></tr>)}
            </tbody>
          </table>
        )}
      </div>
      {ledgerFor && <LedgerDrawer account={ledgerFor} onClose={() => setLedgerFor(null)} />}
      {adjustFor && <AdjustModal account={adjustFor} onClose={() => setAdjustFor(null)} />}
    </div>
  );
}
