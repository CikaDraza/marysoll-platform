"use client";

import Link from "next/link";
import { ArrowTopRightOnSquareIcon, PlusIcon } from "@heroicons/react/20/solid";
import { useEducationContentList } from "@/hooks/education/useEducationContent";
import {
  educationContentOverview,
  educationContentRows,
} from "./education-content-editor-model";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("sr-RS", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export default function EducationOverview({
  publicUrl,
}: {
  publicUrl: string | null;
}) {
  const { data, isLoading } = useEducationContentList();
  const items = data ?? [];
  const overview = educationContentOverview(items);
  const recent = educationContentRows(items, formatDate).slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
            Edu Centar
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            Pregled
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Vaši edukativni materijali i njihovo stanje.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link ka sajtu se nudi tek kad na njemu stvarno nešto stoji. */}
          {publicUrl && overview.hasPublicContent && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Vidi na sajtu
              <ArrowTopRightOnSquareIcon aria-hidden="true" className="size-4" />
            </a>
          )}
          <Link
            href="/education/content/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            Novi sadržaj
          </Link>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Učitavanje…</p>
      ) : overview.total === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Još nemate edukativni sadržaj.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Prvi materijal sastavljate u editoru — tekst, slike, video i fajlove
            dodajete kao blokove.
          </p>
          <Link
            href="/education/content/new"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            Novi sadržaj
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat value={overview.total} label="Ukupno" />
            <Stat value={overview.published} label="Objavljeno" />
            <Stat value={overview.drafts} label="U pripremi" />
            <Stat
              value={overview.unpublishedChanges}
              label="Neobjavljene izmene"
            />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Poslednje izmenjeno
              </h2>
              <Link
                href="/education/content"
                className="text-sm font-semibold text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
              >
                Sav sadržaj
              </Link>
            </div>

            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              {recent.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-gray-900 dark:text-white">
                        {row.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                        {row.kindLabel} · {row.accessLabel} ·{" "}
                        {row.updatedLabel}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.hasUnpublished
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : row.published
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
