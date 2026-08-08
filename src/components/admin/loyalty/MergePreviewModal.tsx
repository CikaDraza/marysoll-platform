"use client";

/**
 * MergePreviewModal — hard-requirement pregled pre spajanja naloga (Phase 4c).
 * Deljen između Growth Studio "Mogući duplikati" i Klijenti liste. Prikazuje
 * Source/Target (desktop jedna pored druge, mobilni jedna ispod druge sa
 * strelicom nadole), šta se prenosi, i finalni zbir "Posle spajanja keeper će
 * imati" (poene backend računa — ne front). Bez potvrde nema merge-a.
 */
import { useState } from "react";
import toast from "react-hot-toast";
import {
  useMergePreview,
  useMergeUsers,
  type MergeAccountSummary,
} from "@/hooks/useLoyaltyAdmin";

function AccountBox({
  account,
  label,
  tone,
  confirmedKeeper,
}: {
  account: MergeAccountSummary;
  label: string;
  tone: "source" | "target";
  confirmedKeeper?: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-xl border p-4 ${
        tone === "target"
          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
          : "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p className="font-bold text-gray-900 dark:text-white truncate">
        {account.name || "—"}
      </p>
      <p className="text-[11px] text-gray-400 truncate">
        {account.email || "bez emaila"}
      </p>
      <p className="text-[11px] text-gray-400">{account.phone || "—"}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600 dark:text-gray-300">
        <span>❤️ {account.hearts}</span>
        <span>⭐ {account.points}</span>
        <span>Termini {account.appointments}</span>
        <span>Vaučeri {account.vouchers}</span>
      </div>
      <p className="mt-2 text-[11px] font-bold">
        {confirmedKeeper ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            ✓ Zadržava se (keeper)
          </span>
        ) : (
          <span className="text-gray-400">
            {account.isRegistered ? "Registrovan" : "Gost"}
          </span>
        )}
      </p>
    </div>
  );
}

export function MergePreviewModal({
  sourceId,
  targetId,
  onClose,
  onMerged,
}: {
  sourceId: string;
  targetId: string;
  onClose: () => void;
  onMerged?: () => void;
}) {
  const { data: preview, isLoading } = useMergePreview(sourceId, targetId);
  const merge = useMergeUsers();
  const [merged, setMerged] = useState(false);

  const handleMerge = async () => {
    try {
      const res = await merge.mutateAsync({ sourceId, targetId });
      setMerged(true); // vizuelni ✓ pre zatvaranja
      toast.success(
        res.alreadyMerged ? "Nalog je već bio spojen." : "Nalozi su spojeni.",
      );
      setTimeout(() => {
        onMerged?.();
        onClose();
      }, 1100);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri spajanju";
      toast.error(msg);
    }
  };

  const busy = merge.isPending || merged;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1">
          Pregled spajanja naloga
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Proverite šta se prenosi pre nego što potvrdite. Akcija se ne poništava
          automatski.
        </p>

        {isLoading || !preview ? (
          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse h-56" />
        ) : (
          <>
            {preview.source && preview.target && (
              <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
                <AccountBox
                  account={preview.source}
                  label="Spaja se (izvor)"
                  tone="source"
                />
                <div className="flex items-center justify-center text-gray-400 font-black text-xl">
                  <span className="sm:hidden">↓</span>
                  <span className="hidden sm:inline">→</span>
                </div>
                <AccountBox
                  account={preview.target}
                  label="Zadržava se (keeper)"
                  tone="target"
                  confirmedKeeper={merged}
                />
              </div>
            )}

            {!preview.allowed ? (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/10 p-3 text-sm text-rose-700 dark:text-rose-300">
                {preview.reason ?? "Spajanje nije dozvoljeno."}
              </div>
            ) : (
              <>
                {/* ── Biće preneto ── */}
                {preview.moves && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Biće preneto
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <span>Termini: {preview.moves.appointments}</span>
                      <span>Vaučeri: {preview.moves.vouchersOwned}</span>
                      <span>Referral veze: {preview.moves.vouchersGifted}</span>
                      <span>
                        Preporuke kao pošiljalac: {preview.moves.referralsAsReferrer}
                      </span>
                      <span>
                        Preporuke kao primalac: {preview.moves.referralsAsReferred}
                      </span>
                      <span>Notifikacije: {preview.moves.notifications}</span>
                      <span>Utisci: {preview.moves.testimonials}</span>
                      <span>Newsletter: {preview.moves.audienceContacts}</span>
                      <span>Loyalty događaji: {preview.moves.loyaltyEvents}</span>
                      <span>Knjiženja: {preview.moves.ledgerEntries}</span>
                    </div>
                  </div>
                )}

                {/* ── Trenutno stanje (izvor / keeper) ── */}
                {preview.source && preview.target && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-950/50">
                          <th className="text-left px-3 py-2" />
                          <th className="px-3 py-2">❤️</th>
                          <th className="px-3 py-2">⭐</th>
                          <th className="px-3 py-2">Termini</th>
                          <th className="px-3 py-2">Vaučeri</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr>
                          <td className="px-3 py-2 text-gray-500 truncate max-w-[8rem]">
                            {preview.source.name || "Izvor"}
                          </td>
                          <td className="px-3 py-2 text-center">{preview.source.hearts}</td>
                          <td className="px-3 py-2 text-center">{preview.source.points}</td>
                          <td className="px-3 py-2 text-center">{preview.source.appointments}</td>
                          <td className="px-3 py-2 text-center">{preview.source.vouchers}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-500 truncate max-w-[8rem]">
                            {preview.target.name || "Keeper"}
                          </td>
                          <td className="px-3 py-2 text-center">{preview.target.hearts}</td>
                          <td className="px-3 py-2 text-center">{preview.target.points}</td>
                          <td className="px-3 py-2 text-center">{preview.target.appointments}</td>
                          <td className="px-3 py-2 text-center">{preview.target.vouchers}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Finalni zbir (sigurnost adminu) ── */}
                {preview.after && (
                  <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/10 p-4 mb-3">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                      Posle spajanja keeper će imati:
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          ❤️ {preview.after.hearts}
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          ⭐ {preview.after.points}
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          {preview.after.appointments}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Termini
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          {preview.after.vouchers}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Vaučeri
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Rizici ── */}
                {preview.risks.length > 0 && (
                  <ul className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/10 p-3 mb-3 space-y-1">
                    {preview.risks.map((r, i) => (
                      <li
                        key={i}
                        className="text-xs text-amber-800 dark:text-amber-200"
                      >
                        ⚠️ {r}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition"
          >
            Otkaži
          </button>
          <button
            onClick={handleMerge}
            disabled={busy || isLoading || !preview?.allowed}
            className={`px-5 py-2 rounded-xl text-white text-sm font-bold transition disabled:opacity-60 ${
              merged
                ? "bg-emerald-600"
                : "bg-violet-600 hover:bg-violet-700 disabled:hover:bg-violet-600"
            }`}
          >
            {merged
              ? "✓ Spojeno"
              : merge.isPending
                ? "Spaja se…"
                : "Potvrdi spajanje"}
          </button>
        </div>
      </div>
    </div>
  );
}
