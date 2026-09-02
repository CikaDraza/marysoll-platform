"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAdjustLoyaltyAccount } from "@/hooks/loyalty/useLoyaltyAdminAccounts";
import { useSalonProfile } from "@/hooks/useSalonProfile";
import { clientNounCap } from "@/lib/clientWording";
import type { LoyaltyAdminAccount } from "@/types/loyalty-admin";
import { loyaltyInput, loyaltyLabel } from "./loyaltyStyles";

function validationError(reason: string, amount: number) {
  if (reason.trim().length < 3) return "Razlog je obavezan (min. 3 karaktera)";
  if (!amount) return "Iznos ne može biti 0";
  return null;
}

function adjustmentMessage(applied: number) {
  if (applied === 0) return "Ništa nije promenjeno (balans ne može ispod 0)";
  const sign = applied > 0 ? "+" : "";
  return `Korekcija proknjižena (${sign}${applied})`;
}

function requestErrorMessage(error: unknown) {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Greška pri korekciji";
}

function accountName(account: LoyaltyAdminAccount, fallback: string) { return account.client?.name ?? fallback; }
function pendingLabel(isPending: boolean) { return isPending ? "Knjiženje..." : "Proknjiži"; }
function integerValue(value: string) { return parseInt(value, 10) || 0; }

export function AdjustModal({ account, onClose }: { account: LoyaltyAdminAccount; onClose: () => void }) {
  const adjust = useAdjustLoyaltyAccount();
  const clientGender = useSalonProfile().data?.clientGender;
  const [currency, setCurrency] = useState<"hearts" | "points">("hearts");
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    const invalid = validationError(reason, amount);
    if (invalid) return toast.error(invalid);
    try {
      const result = await adjust.mutateAsync({ accountId: account._id, currency, amount, reason: reason.trim() });
      toast.success(adjustmentMessage(result.applied));
      onClose();
    } catch (error: unknown) {
      toast.error(requestErrorMessage(error));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1">Korekcija — {accountName(account, clientNounCap(clientGender))}</h3>
        <p className="text-xs text-gray-400 mb-5">Svaka korekcija se trajno beleži u istoriji klijenta.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={loyaltyLabel}>Valuta</label><select className={loyaltyInput} value={currency} onChange={(event) => setCurrency(event.target.value as "hearts" | "points")}><option value="hearts">Srca ❤️</option><option value="points">Poeni ⭐</option></select></div>
            <div><label className={loyaltyLabel}>Iznos (+/-)</label><input type="number" className={loyaltyInput} value={amount} onChange={(event) => setAmount(integerValue(event.target.value))} /></div>
          </div>
          <div><label className={loyaltyLabel}>Razlog (obavezno)</label><input className={loyaltyInput} placeholder="npr. Poklon za rođendan" value={reason} onChange={(event) => setReason(event.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition">Otkaži</button>
          <button onClick={handleSubmit} disabled={adjust.isPending} className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition">{pendingLabel(adjust.isPending)}</button>
        </div>
      </div>
    </div>
  );
}
