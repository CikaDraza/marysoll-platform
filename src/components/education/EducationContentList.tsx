"use client";

import Link from "next/link";
import { PlusIcon } from "@heroicons/react/20/solid";
import { useEducationContentList } from "@/hooks/education/useEducationContent";
import { educationContentRows } from "./education-content-editor-model";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({
  label,
  published,
  hasUnpublished,
}: {
  label: string;
  published: boolean;
  hasUnpublished: boolean;
}) {
  // Tri stanja, ne dva: objavljen sadržaj sa sačuvanim izmenama je treće i
  // vlasnica mora da ga razlikuje od objavljenog bez izmena.
  const tone = hasUnpublished
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : published
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export default function EducationContentList() {
  const { data, isLoading, isError } = useEducationContentList();
  const rows = educationContentRows(data ?? [], formatDate);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sadržaj
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Edukativni materijali koje objavljujete i delite sa klijentima.
          </p>
        </div>
        <Link
          href="/education/content/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          Novi sadržaj
        </Link>
      </header>

      {isLoading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Učitavanje sadržaja…
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          Sadržaj trenutno nije moguće učitati. Osvežite stranicu i pokušajte
          ponovo.
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Još nemate edukativni sadržaj.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Prvi materijal sastavljate u editoru — tekst, slike, video i
            fajlove dodajete kao blokove.
          </p>
          <Link
            href="/education/content/new"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            Novi sadržaj
          </Link>
        </section>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Naslov</th>
                <th className="px-5 py-3 font-semibold">Vrsta</th>
                <th className="px-5 py-3 font-semibold">Vidljivost</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Izmenjeno</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-5 py-4">
                    <Link
                      href={row.href}
                      className="font-semibold text-gray-900 hover:text-violet-600 dark:text-white dark:hover:text-violet-400"
                    >
                      {row.title}
                    </Link>
                    {row.slug && (
                      <p className="mt-0.5 text-xs text-gray-400">/{row.slug}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                    {row.kindLabel}
                  </td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                    {row.visibilityLabel}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      label={row.statusLabel}
                      published={row.published}
                      hasUnpublished={row.hasUnpublished}
                    />
                  </td>
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                    {row.updatedLabel}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={row.href}
                      className="text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
                    >
                      Uredi
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
