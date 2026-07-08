"use client";

/**
 * Growth Studio — admin pregled loyalty naloga: lista, drill-in ledger,
 * ručna korekcija (obavezan razlog → adjust unos u ledger).
 */
import { useState } from "react";
import toast from "react-hot-toast";
import {
  useLoyaltyAdminAccounts,
  useLoyaltyAdminLedger,
  useAdjustLoyaltyAccount,
  type LoyaltyAdminAccount,
} from "@/hooks/useLoyaltyAdmin";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm";
const inp =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30";
const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";

function AdjustModal({
  account,
  onClose,
}: {
  account: LoyaltyAdminAccount;
  onClose: () => void;
}) {
  const adjust = useAdjustLoyaltyAccount();
  const [currency, setCurrency] = useState<"hearts" | "points">("hearts");
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Razlog je obavezan (min. 3 karaktera)");
      return;
    }
    if (!amount) {
      toast.error("Iznos ne može biti 0");
      return;
    }
    try {
      const res = await adjust.mutateAsync({
        accountId: account._id,
        currency,
        amount,
        reason: reason.trim(),
      });
      toast.success(
        res.applied !== 0
          ? `Korekcija proknjižena (${res.applied > 0 ? "+" : ""}${res.applied})`
          : "Ništa nije promenjeno (balans ne može ispod 0)",
      );
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri korekciji";
      toast.error(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1">
          Korekcija — {account.client?.name ?? "Klijent"}
        </h3>
        <p className="text-xs text-gray-400 mb-5">
          Svaka korekcija se trajno beleži u istoriji klijenta.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Valuta</label>
              <select
                className={inp}
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as "hearts" | "points")
                }
              >
                <option value="hearts">Srca ❤️</option>
                <option value="points">Poeni ⭐</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Iznos (+/-)</label>
              <input
                type="number"
                className={inp}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Razlog (obavezno)</label>
            <input
              className={inp}
              placeholder="npr. Poklon za rođendan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition"
          >
            Otkaži
          </button>
          <button
            onClick={handleSubmit}
            disabled={adjust.isPending}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition"
          >
            {adjust.isPending ? "Knjiženje..." : "Proknjiži"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LedgerDrawer({
  account,
  onClose,
}: {
  account: LoyaltyAdminAccount;
  onClose: () => void;
}) {
  const { data, isLoading } = useLoyaltyAdminLedger(account._id);

  return (
    <div
      className="fixed inset-0 z-[998] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">
          Istorija — {account.client?.name ?? "Klijent"}
        </h3>
        {isLoading ? (
          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse h-32" />
        ) : !data?.entries?.length ? (
          <p className="text-xs text-gray-400 text-center py-8">
            Nema knjiženja.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.entries.map((e) => (
              <li key={e._id} className="py-2.5 flex justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    {e.description}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(e.createdAt).toLocaleString("sr-RS")} ·{" "}
                    {e.entryType}
                  </p>
                </div>
                <span
                  className={`text-sm font-black flex-shrink-0 ${
                    e.amount > 0 ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {e.amount > 0 ? "+" : ""}
                  {e.amount} {e.currency === "hearts" ? "❤️" : "⭐"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function LoyaltyClients() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useLoyaltyAdminAccounts(q);
  const [ledgerFor, setLedgerFor] = useState<LoyaltyAdminAccount | null>(null);
  const [adjustFor, setAdjustFor] = useState<LoyaltyAdminAccount | null>(null);

  return (
    <div className="space-y-4">
      <input
        className={`${inp} max-w-sm`}
        placeholder="Pretraga po imenu ili emailu..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className={`${card} overflow-x-auto`}>
        {isLoading ? (
          <div className="p-6">
            <div className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse h-32" />
          </div>
        ) : !data?.accounts?.length ? (
          <p className="text-xs text-gray-400 text-center py-10">
            Još nema loyalty naloga — nastaju automatski prvom nagradom.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3">Klijent</th>
                <th className="px-3 py-3">❤️</th>
                <th className="px-3 py-3">⭐</th>
                <th className="px-3 py-3">Posete</th>
                <th className="px-3 py-3">🔥 Niz</th>
                <th className="px-3 py-3">Nije došao</th>
                <th className="px-3 py-3">Potrošnja</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {data.accounts.map((a) => (
                <tr key={a._id}>
                  <td className="px-5 py-3">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {a.client?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {a.client?.email ?? ""}
                    </p>
                  </td>
                  <td className="px-3 py-3 font-bold">{a.heartsBalance}</td>
                  <td className="px-3 py-3 font-bold">{a.pointsBalance}</td>
                  <td className="px-3 py-3">{a.completedVisits}</td>
                  <td className="px-3 py-3 font-bold">
                    {(a.checkinStreak ?? 0) > 0 ? `🔥 ${a.checkinStreak}` : "—"}
                  </td>
                  <td className="px-3 py-3">{a.noShows}</td>
                  <td className="px-3 py-3">{a.totalSpend} RSD</td>
                  <td className="px-3 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => setLedgerFor(a)}
                      className="text-xs font-bold text-violet-600 hover:text-violet-800 mr-3"
                    >
                      Istorija
                    </button>
                    <button
                      onClick={() => setAdjustFor(a)}
                      className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Korekcija
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ledgerFor && (
        <LedgerDrawer account={ledgerFor} onClose={() => setLedgerFor(null)} />
      )}
      {adjustFor && (
        <AdjustModal account={adjustFor} onClose={() => setAdjustFor(null)} />
      )}
    </div>
  );
}
