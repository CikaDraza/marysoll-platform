"use client";

/**
 * Growth Studio — "Mogući duplikati" (Phase 4b/4c).
 * Grupiše naloge istog klijenta (isti telefon, bar jedan gost) i nudi bezbedno
 * spajanje: vlasnik bira "keeper" (podrazumevano registrovani), ostali se spajaju
 * u njega (termini + poeni + vaučeri se premeštaju, gost deaktivira). Poluautomatski
 * — sistem flaguje, vlasnik potvrdi.
 */
import { useState } from "react";
import toast from "react-hot-toast";
import {
  useDuplicateGroups,
  useMergeUsers,
  type DuplicateAccount,
  type DuplicateGroup,
} from "@/hooks/useLoyaltyAdmin";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm";

function RoleBadge({ isRegistered }: { isRegistered: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isRegistered
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      }`}
    >
      {isRegistered ? "Registrovan" : "Gost"}
    </span>
  );
}

function AccountCard({
  account,
  selected,
  onSelect,
}: {
  account: DuplicateAccount;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border p-4 transition ${
        selected
          ? "border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/50 dark:bg-violet-900/10"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-bold text-gray-900 dark:text-white truncate">
          {account.name || "—"}
        </span>
        <RoleBadge isRegistered={account.isRegistered} />
      </div>
      <p className="text-[11px] text-gray-400 truncate">
        {account.email || "bez emaila"}
      </p>
      <p className="text-[11px] text-gray-400">{account.phone || "—"}</p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
        <span>❤️ {account.hearts}</span>
        <span>⭐ {account.points}</span>
        <span>Posete: {account.visits}</span>
        <span>Termini: {account.appointments}</span>
      </div>
      <p className="mt-2 text-[11px] font-bold text-violet-600 dark:text-violet-400">
        {selected ? "✓ Zadržava se (keeper)" : "Klikni da bude keeper"}
      </p>
    </button>
  );
}

function GroupCard({ group }: { group: DuplicateGroup }) {
  const merge = useMergeUsers();
  // Podrazumevani keeper: prvi registrovani, inače prvi u grupi.
  const defaultKeeper =
    group.accounts.find((a) => a.isRegistered)?._id ?? group.accounts[0]._id;
  const [keeperId, setKeeperId] = useState(defaultKeeper);
  const [confirming, setConfirming] = useState(false);

  const sources = group.accounts.filter((a) => a._id !== keeperId);
  const keeper = group.accounts.find((a) => a._id === keeperId);

  const handleMerge = async () => {
    try {
      for (const src of sources) {
        await merge.mutateAsync({ sourceId: src._id, targetId: keeperId });
      }
      toast.success(
        sources.length > 1
          ? `${sources.length} naloga spojena u ${keeper?.name || "keeper"}`
          : `Nalog spojen u ${keeper?.name || "keeper"}`,
      );
      setConfirming(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri spajanju";
      toast.error(msg);
    }
  };

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-black text-gray-900 dark:text-white">
            Telefon: {group.key}
          </p>
          <p className="text-[11px] text-gray-400">
            {group.accounts.length} naloga — verovatno isti klijent
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.accounts.map((a) => (
          <AccountCard
            key={a._id}
            account={a}
            selected={a._id === keeperId}
            onSelect={() => setKeeperId(a._id)}
          />
        ))}
      </div>

      {!confirming ? (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setConfirming(true)}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition"
          >
            Spoji naloge
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Spajaš{" "}
            <b>
              {sources.map((s) => s.name || s.email || "gost").join(", ")}
            </b>{" "}
            u <b>{keeper?.name || "keeper"}</b>. Termini, poeni i vaučeri prelaze
            na keeper; ostali nalozi se deaktiviraju. Ova akcija se ne poništava
            automatski.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={merge.isPending}
              className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              Otkaži
            </button>
            <button
              onClick={handleMerge}
              disabled={merge.isPending}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition"
            >
              {merge.isPending ? "Spajanje..." : "Potvrdi spajanje"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LoyaltyDuplicates() {
  const { data, isLoading } = useDuplicateGroups();

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse h-40" />
    );
  }

  if (!data?.groups?.length) {
    return (
      <div className={`${card} p-10 text-center`}>
        <p className="text-3xl mb-2">✨</p>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
          Nema mogućih duplikata
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Kada isti klijent zakaže i kao gost i kao registrovan (isti telefon),
          par će se pojaviti ovde na potvrdu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        Nalozi sa istim telefonom gde je bar jedan gost. Izaberite koji nalog se
        zadržava, pa spojite.
      </p>
      {data.groups.map((g) => (
        <GroupCard key={g.key} group={g} />
      ))}
    </div>
  );
}
