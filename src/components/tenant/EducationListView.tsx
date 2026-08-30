import Link from "next/link";
import { ContentImage } from "@/components/content-composer/blocks/ContentImage";
import { EDUCATION_KIND_LABELS } from "@/lib/education/content-document";
import type { PublicEducationSummary } from "@/lib/education/publicContent";
import {
  formatPublishedDate,
  type EducationAuthor,
} from "@/lib/education/presentation";

interface Props {
  items: PublicEducationSummary[];
  basePath: string;
  author: EducationAuthor | null;
  intro?: string;
}

function GatedTag() {
  return (
    <span className="bg-ee-accent text-ee-canvas font-instrument-sans rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
      Uz odobrenje
    </span>
  );
}

function CardMeta({
  item,
  author,
}: {
  item: PublicEducationSummary;
  author: EducationAuthor | null;
}) {
  return (
    <p className="font-instrument-sans text-ee-text-muted mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
      <time dateTime={item.publishedAt}>{formatPublishedDate(item.publishedAt)}</time>
      {author && (
        <>
          <span aria-hidden="true">·</span>
          <span>{author.name}</span>
        </>
      )}
    </p>
  );
}

/**
 * Javna lista je identična za svakog posetioca. Zaključan sadržaj se vidi, ali
 * sa oznakom i samo svojim javnim pregledom — nikada delom teksta.
 */
export function EducationListView({ items, basePath, author, intro }: Props) {
  const [lead, ...rest] = items;

  return (
    <div className="bg-ee-canvas">
      <div className="mx-auto w-full max-w-[1140px] px-5 py-14 sm:py-20">
        <header className="max-w-[46ch]">
          <h1 className="font-newsreader text-ee-accent text-[clamp(34px,4.6vw,58px)] leading-[1.04] tracking-[-0.024em]">
            Edukacija
          </h1>
          <p className="font-instrument-sans text-ee-text-muted mt-5 text-[17px] leading-[1.75]">
            {intro || "Stručni tekstovi, vodiči i materijali."}
          </p>
        </header>

        {items.length === 0 ? (
          <p className="border-ee-border font-instrument-sans text-ee-text-muted mt-12 rounded-[28px] border border-dashed px-6 py-14 text-center text-[16px]">
            Uskoro objavljujemo prve tekstove.
          </p>
        ) : (
          <ul className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Prvi zapis nosi širu karticu — najnovije je i najvažnije. */}
            <li className="lg:col-span-2">
              <Link
                href={`${basePath}/edukacija/${lead.slug}`}
                className="group border-ee-border bg-ee-surface-muted grid overflow-hidden rounded-[28px] border lg:grid-cols-2"
              >
                {lead.coverImage && (
                  <ContentImage
                    src={lead.coverImage}
                    alt={lead.title}
                    className="aspect-[16/10] w-full object-cover lg:h-full"
                  />
                )}
                <div className="p-7 sm:p-9">
                  <span className="font-instrument-sans text-ee-text flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em]">
                    {EDUCATION_KIND_LABELS[lead.kind] ?? "Edukacija"}
                    {lead.accessMode === "gated" && <GatedTag />}
                  </span>
                  <h2 className="font-newsreader text-ee-accent mt-3 text-[clamp(24px,2.8vw,34px)] leading-[1.12] transition-opacity group-hover:opacity-80">
                    {lead.title}
                  </h2>
                  {lead.description && (
                    <p className="font-instrument-sans text-ee-text-muted mt-4 max-w-[52ch] text-[16px] leading-[1.7]">
                      {lead.description}
                    </p>
                  )}
                  <CardMeta item={lead} author={author} />
                </div>
              </Link>
            </li>

            {rest.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`${basePath}/edukacija/${item.slug}`}
                  className="group border-ee-border bg-ee-surface flex h-full flex-col overflow-hidden rounded-[28px] border"
                >
                  {item.coverImage && (
                    <ContentImage
                      src={item.coverImage}
                      alt={item.title}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-7">
                    <span className="font-instrument-sans text-ee-accent-contrast flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em]">
                      {EDUCATION_KIND_LABELS[item.kind] ?? "Edukacija"}
                      {item.accessMode === "gated" && <GatedTag />}
                    </span>
                    <h2 className="font-newsreader text-ee-accent group-hover:text-ee-accent-contrast mt-3 text-[22px] leading-[1.16] transition-colors">
                      {item.title}
                    </h2>
                    {item.description && (
                      <p className="font-instrument-sans text-ee-text-muted mt-3 text-[15px] leading-[1.7]">
                        {item.description}
                      </p>
                    )}
                    <CardMeta item={item} author={author} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
