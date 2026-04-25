import { useUsers } from "@/hooks/useUsers";
import Loader from "../elements/Loader";
import { formatISODate } from "@/helpers/formatISODate";
import { useEffect, useState } from "react";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { IUser } from "@/types";
import ClientModalActionButtons from "./ClientModalActionButtons";

export default function ClientsList() {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");

  const [debouncedText, setDebouncedText] = useState("");
  const [debouncedDate, setDebouncedDate] = useState("");

  // ⏳ DEBOUNCE TEXT (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ⏳ DEBOUNCE DATE (200ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDate(date), 200);
    return () => clearTimeout(t);
  }, [date]);

  // ⭐ Svi korisnici (bez admina)
  const {
    data: allUsers = [],
    isLoading: loadingAll,
    isError: errorAll,
  } = useUsers();

  // ⭐ Rezultati pretrage
  const { data: filteredUsers = [], isLoading: searching } = useSearchUsers(
    debouncedText,
    debouncedDate,
  );

  const users =
    debouncedText.length > 0 || debouncedDate.length > 0
      ? filteredUsers
      : allUsers;

  if (loadingAll) return <Loader />;
  if (errorAll) return <p>Greška pri učitavanju termina.</p>;

  return (
    <div>
      <div className="max-w-full flex flex-col lg:flex-row items-center mb-3">
        <h3 className="flex-1 font-semibold text-(--primary-color) text-2xl!">
          Lista svih klijenata
        </h3>
        <div className="flex flex-col lg:flex-row w-full lg:max-w-md gap-x-4 gap-y-2 lg:gap-y-0 mt-4 lg:mt-0">
          <input
            id="search-appointment"
            type="text"
            placeholder="Pretraži klijente..."
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 w-full flex-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white/5 px-3.5 py-2 text-base text-gray-600 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-(--secondary-color) sm:text-sm/6"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
                  <p className="text-sm/6 font-semibold text-gray-900 dark:text-gray-300">
                    {user.name}
                  </p>
                  <p className="mt-1 truncate text-xs/5 text-gray-500">
                    {user.email}
                  </p>
                </div>
                <ClientModalActionButtons userIsSet={user} />
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
      {loadingAll ||
        (searching && (
          <p className="text-xs text-gray-500 mt-1">Učitavanje korisnika...</p>
        ))}
    </div>
  );
}
