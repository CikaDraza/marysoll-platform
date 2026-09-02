import { useClients } from "@/hooks/useClients";
import Loader from "../elements/Loader";
import Paginator from "../elements/Paginator";
import { formatISODate } from "@/helpers/formatISODate";
import {
  displayClientContact,
  isPlaceholderGuestEmail,
  normalizeInstagram,
} from "@/lib/contactRules";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Client360 from "./Client360";
import { useDebounce } from "@/hooks/useDebounce";
import { IUser } from "@/types";
import ClientModalActionButtons from "./ClientModalActionButtons";
import { useDuplicateGroups } from "@/hooks/useLoyaltyAdmin";
import { MergePreviewModal } from "./loyalty/MergePreviewModal";

interface DupInfo {
  isKeeper: boolean;
  targetId: string;
  targetName: string;
}

export default function ClientsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedClientId = searchParams.get("clientId");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [mergePair, setMergePair] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);

  // ⭐ Mogući duplikati (isti telefon, bar jedan gost) → badge + merge u listi
  const { data: dupData } = useDuplicateGroups();
  const dupMap = useMemo(() => {
    const map = new Map<string, DupInfo>();
    for (const g of dupData?.groups ?? []) {
      const keeper =
        g.accounts.find((a) => a.isRegistered) ?? g.accounts[0];
      for (const a of g.accounts) {
        map.set(a._id, {
          isKeeper: a._id === keeper._id,
          targetId: keeper._id,
          targetName: keeper.name || keeper.email || "keeper",
        });
      }
    }
    return map;
  }, [dupData]);

  const debouncedText = useDebounce(query, 300);
  const debouncedDate = useDebounce(date, 200);

  // ⭐ Klijenti sa servera, 10 po strani (pretraga i datum se filtriraju na
  // serveru — ne dovlači se cela lista pa seče u browseru)
  const {
    data: response,
    isLoading: loadingAll,
    isError: errorAll,
    isFetching: searching,
  } = useClients({
    page,
    limit: 10,
    query: debouncedText,
    date: debouncedDate,
  });

  const users = useMemo(() => response?.users ?? [], [response?.users]);
  const pagination = response?.pagination;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (selectedClientId) {
    return <Client360 clientId={selectedClientId} onBack={() => router.push("/dashboard?tab=klijenti")} />;
  }

  if (loadingAll) return <Loader />;
  if (errorAll) return <p>Greška pri učitavanju klijenata.</p>;

  return (
    <div>
      <div className="max-w-full flex flex-col lg:flex-row items-center mb-3">
        <h3 className="flex-1 font-semibold text-(--primary-color) text-2xl!">
          Lista svih klijenata
          {pagination && pagination.totalCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({pagination.totalCount})
            </span>
          )}
        </h3>
        <div className="flex flex-col lg:flex-row w-full lg:max-w-md gap-x-4 gap-y-2 lg:gap-y-0 mt-4 lg:mt-0">
          <input
            id="search-appointment"
            type="text"
            placeholder="Ime, prezime, mejl, @instagram, @tiktok..."
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1); // nova pretraga počinje od prve strane
            }}
            className="min-w-0 w-full flex-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white/5 px-3.5 py-2 text-base text-gray-600 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color) sm:text-sm/6"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 dark:text-gray-500 p-2 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)"
          />
        </div>
      </div>
      {loadingAll ? (
        <Loader />
      ) : (
        <ul
          role="list"
          className="divide-y divide-gray-100 dark:divide-gray-700"
        >
          {users.map((user: IUser) => (
            <li key={user.email} className="flex justify-between gap-x-6 py-5">
              <div className="flex flex-col min-w-0 gap-x-4">
                <div className="min-w-0 flex-auto">
                  <p className="text-sm/6 font-semibold text-gray-900 dark:text-gray-300 flex items-center gap-2 flex-wrap">
                    <button className="text-left hover:text-violet-600 hover:underline" onClick={() => router.push(`/dashboard?tab=klijenti&clientId=${user._id}`)}>{user.name}</button>
                    {dupMap.has(user._id) && (
                      <span className="inline-block rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        Mogući duplikat
                      </span>
                    )}
                  </p>
                  {/* Gostima bez pravog emaila se ne prikazuje generički
                      guest_...@noemail.guest — nego Instagram pa telefon */}
                  <p className="mt-1 truncate text-xs/5 text-gray-500">
                    {displayClientContact({
                      email: user.email,
                      instagram: user.instagram,
                      phone: user.phone,
                    })}
                  </p>
                  {normalizeInstagram(user.instagram) &&
                    !isPlaceholderGuestEmail(user.email) && (
                      <p className="mt-0.5 truncate text-xs/5 text-gray-500">
                        @{normalizeInstagram(user.instagram)}
                      </p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <ClientModalActionButtons userIsSet={user} />
                  {dupMap.get(user._id) &&
                    !dupMap.get(user._id)!.isKeeper && (
                      <button
                        onClick={() =>
                          setMergePair({
                            sourceId: user._id,
                            targetId: dupMap.get(user._id)!.targetId,
                          })
                        }
                        className="text-xs font-bold text-violet-600 hover:text-violet-800"
                      >
                        Spoji sa {dupMap.get(user._id)!.targetName} →
                      </button>
                    )}
                </div>
              </div>
              <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
                <div className="mt-1 flex flex-col items-end gap-x-1.5">
                  {user.isOnline ? (
                    <div className="mt-1 flex items-center gap-x-1.5">
                      <div className="flex-none rounded-full animate-pulse bg-emerald-500/20 p-1">
                        <div className="size-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-xs/5 text-gray-500">Online</p>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-x-1.5">
                      <div className="flex-none rounded-full bg-red-500/20 p-1">
                        <div className="size-1.5 rounded-full bg-red-500" />
                      </div>
                      <p className="text-xs/5 text-gray-500">Offline</p>
                    </div>
                  )}
                  {user.lastActive && (
                    <p className="mt-1 text-xs/5 text-gray-500">
                      Zadnji put aktivan:{" "}
                      <time dateTime={user.lastActive.toString()}>
                        {formatISODate(user.lastActive.toString())}
                      </time>
                    </p>
                  )}
                  <p className="text-xs/5 text-gray-500">
                    <time dateTime={user.createdAt ?? new Date().toISOString()}>
                      Kreiran: {formatISODate(user.createdAt ?? "")}
                    </time>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loadingAll && users.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          {debouncedText || debouncedDate
            ? "Nema klijenata za zadatu pretragu."
            : "Još nema klijenata."}
        </p>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Paginator pagination={pagination} onPageChange={handlePageChange} />
      )}

      {searching && !loadingAll && (
        <p className="text-xs text-gray-500 mt-1">Učitavanje korisnika...</p>
      )}

      {mergePair && (
        <MergePreviewModal
          sourceId={mergePair.sourceId}
          targetId={mergePair.targetId}
          onClose={() => setMergePair(null)}
        />
      )}
    </div>
  );
}
