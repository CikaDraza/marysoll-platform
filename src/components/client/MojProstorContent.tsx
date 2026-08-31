"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useClientRouting } from "@/hooks/useClientRouting";
import { ContentImage } from "@/components/content-composer/blocks/ContentImage";
import { EDUCATION_KIND_LABELS } from "@/lib/education/content-document";
import { formatPublishedDate } from "@/lib/education/presentation";
import type { AssignedEducationSummary } from "@/lib/education/entitlement";

/**
 * „Moji sadržaji" — materijali koje je vlasnica namenila baš ovoj klijentkinji.
 *
 * Lista ne nosi telo: ono se čita tek na zaštićenoj strani, kroz istu proveru
 * dodele. Ovde nema ni jednog bloka, pa ni greška u prikazu ne može da otkrije
 * zaključan tekst.
 */
export default function MojProstorContent() {
  const { base } = useClientRouting();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["education", "my-content"],
    queryFn: async () => {
      const { data } = await api.get<{ items: AssignedEducationSummary[] }>(
        "/education/my-content",
      );
      return data.items;
    },
  });

  const items = data ?? [];

  if (isLoading) {
    return <p className="text-sm text-gray-500">Učitavanje…</p>;
  }

  if (isError) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Sadržaj trenutno nije moguće učitati. Osvežite stranicu.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Ovde će stajati materijali koji su namenjeni vama.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
          Kada vam neki sadržaj bude dodeljen, pojaviće se na ovom mestu.
        </p>
      </section>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`${base}/panel/moj-prostor/sadrzaji/${item.id}`}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-violet-400"
          >
            {item.cover && (
              <ContentImage
                src={item.cover.src}
                alt={item.title}
                focalPoint={item.cover.focalPoint}
                className="aspect-[16/10] w-full object-cover"
              />
            )}
            <div className="flex flex-1 flex-col p-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                {EDUCATION_KIND_LABELS[item.kind] ?? "Edukacija"}
              </span>
              <h3 className="mt-2 font-semibold text-gray-900">{item.title}</h3>
              {item.description && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                  {item.description}
                </p>
              )}
              <time
                dateTime={item.publishedAt}
                className="mt-auto pt-3 text-xs text-gray-400"
              >
                {formatPublishedDate(item.publishedAt)}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
