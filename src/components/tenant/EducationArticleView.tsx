import { BlockList } from "@/components/content-composer/BlockList";
import { EDUCATION_KIND_LABELS } from "@/lib/education/content-document";
import type { PublicEducationArticle } from "@/lib/education/publicContent";

/**
 * Neutralan editorial prikaz (3A.1). Koristi ISTI `BlockList` koji vlasnica
 * vidi u Pregledu — ono što je odobrila je doslovno ono što se ovde renderuje.
 * Theme-9-native prezentacija je zaseban dizajnerski rez (3B).
 */
export function EducationArticleView({
  article,
}: {
  article: PublicEducationArticle;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          {EDUCATION_KIND_LABELS[article.kind] ?? "Edukacija"}
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
          {article.title}
        </h1>
        {article.description && (
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            {article.description}
          </p>
        )}
        <time
          dateTime={article.publishedAt}
          className="mt-4 block text-sm text-gray-400"
        >
          {new Date(article.publishedAt).toLocaleDateString("sr-RS", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
      </header>

      <div className="space-y-10">
        <BlockList blocks={article.blocks} />
      </div>
    </article>
  );
}
