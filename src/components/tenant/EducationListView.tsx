import Link from "next/link";
import { EDUCATION_KIND_LABELS } from "@/lib/education/content-document";
import type { PublicEducationSummary } from "@/lib/education/publicContent";

/**
 * Javna lista je identična za svakog posetioca: objavljeni javni sadržaj i
 * ništa više. Privatan sadržaj se ovde ne pojavljuje ni prijavljenoj
 * klijentkinji — on živi u njenom prostoru.
 */
export function EducationListView({
  items,
  basePath,
}: {
  items: PublicEducationSummary[];
  basePath: string;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Edukacija
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Stručni tekstovi, saveti i materijali.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Uskoro objavljujemo prve tekstove.
        </p>
      ) : (
        <ul className="space-y-6">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`${basePath}/edukacija/${item.slug}`}
                className="block rounded-2xl border border-gray-200 p-6 transition hover:border-gray-400"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {EDUCATION_KIND_LABELS[item.kind] ?? "Edukacija"}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">
                  {item.title}
                </h2>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-gray-600">
                    {item.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
