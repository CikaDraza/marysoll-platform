import { useState } from "react";
import Loader from "../../elements/Loader";
import Paginator from "../../elements/Paginator";
import { MergePreviewModal } from "../loyalty/MergePreviewModal";
import { useClientDirectory, type ClientDuplicateInfo } from "@/hooks/useClientDirectory";
import type { IUser, PaginationInfo } from "@/types";
import { ClientDirectoryRow } from "./ClientDirectoryRow";

interface MergePair { sourceId: string; targetId: string }

function totalCountOf(pagination?: PaginationInfo) { return pagination?.totalCount ?? 0; }
function hasDirectoryFilters(text: string, date: string) { return Boolean(text || date); }

function ClientDirectoryHeader({ query, date, totalCount, onQueryChange, onDateChange }: { query: string; date: string; totalCount: number; onQueryChange: (value: string) => void; onDateChange: (value: string) => void }) {
  return <div className="max-w-full flex flex-col lg:flex-row items-center mb-3"><h3 className="flex-1 font-semibold text-(--primary-color) text-2xl!">Lista svih klijenata{totalCount > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({totalCount})</span>}</h3><div className="flex flex-col lg:flex-row w-full lg:max-w-md gap-x-4 gap-y-2 lg:gap-y-0 mt-4 lg:mt-0"><input id="search-appointment" type="text" placeholder="Ime, prezime, mejl, @instagram, @tiktok..." autoComplete="off" value={query} onChange={(event) => onQueryChange(event.target.value)} className="min-w-0 w-full flex-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white/5 px-3.5 py-2 text-base text-gray-600 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color) sm:text-sm/6" /><input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 dark:text-gray-500 p-2 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color)" /></div></div>;
}

function ClientRows({ users, duplicateMap, filtered, onMerge }: { users: IUser[]; duplicateMap: Map<string, ClientDuplicateInfo>; filtered: boolean; onMerge: (sourceId: string, targetId: string) => void }) {
  if (!users.length) return <p className="py-8 text-center text-sm text-gray-500">{filtered ? "Nema klijenata za zadatu pretragu." : "Još nema klijenata."}</p>;
  return <ul role="list" className="divide-y divide-gray-100 dark:divide-gray-700">{users.map((user) => <ClientDirectoryRow key={user._id} user={user} duplicate={duplicateMap.get(user._id)} onMerge={onMerge} />)}</ul>;
}

function DirectoryFooter({ pagination, isFetching, onPageChange }: { pagination?: PaginationInfo; isFetching: boolean; onPageChange: (page: number) => void }) {
  return <>{pagination && pagination.totalPages > 1 && <Paginator pagination={pagination} onPageChange={onPageChange} />}{isFetching && <p className="text-xs text-gray-500 mt-1">Učitavanje korisnika...</p>}</>;
}

function MergeDialog({ pair, onClose }: { pair: MergePair | null; onClose: () => void }) {
  if (!pair) return null;
  return <MergePreviewModal sourceId={pair.sourceId} targetId={pair.targetId} onClose={onClose} />;
}

function ReadyDirectory({ directory, query, date, mergePair, setQuery, setDate, setPage, setMergePair }: {
  directory: ReturnType<typeof useClientDirectory>;
  query: string;
  date: string;
  mergePair: MergePair | null;
  setQuery: (value: string) => void;
  setDate: (value: string) => void;
  setPage: (value: number) => void;
  setMergePair: (value: MergePair | null) => void;
}) {
  const resetPageAnd = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };
  const handlePageChange = (nextPage: number) => { setPage(nextPage); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div><ClientDirectoryHeader query={query} date={date} totalCount={totalCountOf(directory.pagination)} onQueryChange={resetPageAnd(setQuery)} onDateChange={resetPageAnd(setDate)} /><ClientRows users={directory.users} duplicateMap={directory.duplicateMap} filtered={hasDirectoryFilters(directory.debouncedText, directory.debouncedDate)} onMerge={(sourceId, targetId) => setMergePair({ sourceId, targetId })} /><DirectoryFooter pagination={directory.pagination} isFetching={directory.isFetching} onPageChange={handlePageChange} /><MergeDialog pair={mergePair} onClose={() => setMergePair(null)} /></div>;
}

export default function ClientDirectory() {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [mergePair, setMergePair] = useState<MergePair | null>(null);
  const directory = useClientDirectory({ page, query, date });

  if (directory.isLoading) return <Loader />;
  if (directory.isError) return <p>Greška pri učitavanju klijenata.</p>;
  return <ReadyDirectory directory={directory} query={query} date={date} mergePair={mergePair} setQuery={setQuery} setDate={setDate} setPage={setPage} setMergePair={setMergePair} />;
}
