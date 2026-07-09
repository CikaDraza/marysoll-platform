"use client";

/**
 * Growth Studio — "Mogući duplikati" (Phase 4b/4c).
 * Grupiše naloge istog klijenta (isti telefon, bar jedan gost) i nudi bezbedno
 * spajanje: vlasnik bira "keeper" (podrazumevano registrovani), ostali se spajaju
 * u njega (termini + poeni + vaučeri se premeštaju, gost deaktivira). Poluautomatski
 * — sistem flaguje, vlasnik potvrdi.
 */
import { useState } from "react";
import {
  useDuplicateGroups,
  type DuplicateAccount,
  type DuplicateGroup,
} from "@/hooks/useLoyaltyAdmin";
import { MergePreviewModal } from "./MergePreviewModal";

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
  isKeeper,
  onSelectKeeper,
  onMerge,
}: {
  account: DuplicateAccount;
  isKeeper: boolean;
  onSelectKeeper: () => void;
  onMerge: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isKeeper
          ? "border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-900/10"
          : "border-gray-200 dark:border-gray-700"
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
      <div className="mt-3">
        {isKeeper ? (
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            ✓ Zadržava se (keeper)
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={onSelectKeeper}
              className="text-[11px] font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Postavi kao keeper
            </button>
            <button
              onClick={onMerge}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-800"
            >
              Spoji u keeper →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: DuplicateGroup }) {
  // Podrazumevani keeper: prvi registrovani, inače prvi u grupi.
  const defaultKeeper =
    group.accounts.find((a) => a.isRegistered)?._id ?? group.accounts[0]._id;
  const [keeperId, setKeeperId] = useState(defaultKeeper);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

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
            isKeeper={a._id === keeperId}
            onSelectKeeper={() => setKeeperId(a._id)}
            onMerge={() => setMergeSourceId(a._id)}
          />
        ))}
      </div>

      {mergeSourceId && (
        <MergePreviewModal
          sourceId={mergeSourceId}
          targetId={keeperId}
          onClose={() => setMergeSourceId(null)}
        />
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
