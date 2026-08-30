import { BlockList } from "@/components/content-composer/BlockList";
import { ContentImage } from "@/components/content-composer/blocks/ContentImage";
import { EDUCATION_KIND_LABELS } from "@/lib/education/content-document";
import type { PublicEducationArticle } from "@/lib/education/publicContent";
import {
  educationAuthorFromSalon,
  formatPublishedDate,
  formatReadingTime,
  readingTimeMinutes,
  type EducationAuthor,
} from "@/lib/education/presentation";
import { EducationAuthorBox } from "./EducationAuthorBox";
import { EducationBreadcrumb } from "./EducationBreadcrumb";

interface Props {
  article: PublicEducationArticle;
  basePath: string;
  author: EducationAuthor | null;
  /** Zaključan sadržaj deli isto zaglavlje, ali umesto tela dobija gate. */
  children?: React.ReactNode;
}

/**
 * Semantički ugovor javnog Education detalja:
 *
 *   jedan `h1`      naslov dolazi iz `EducationContent.title`
 *   blokovi         počinju od `h2` (`headingScope="section"`)
 *   `article`       telo sadržaja
 *   `nav`           breadcrumb, sa `aria-label`
 *   `time`          datum sa `datetime` atributom
 *   `figure`        hero i slike u blokovima
 *   `aside`         callout i autor
 */
export function EducationArticleView({ article, basePath, author, children }: Props) {
  const minutes = readingTimeMinutes(article.blocks);
  const readingTime = formatReadingTime(minutes);
  const publishedLabel = formatPublishedDate(article.publishedAt);

  return (
    <div className="bg-ee-canvas">
      <div className="mx-auto w-full max-w-[760px] px-5 py-14 sm:py-20">
        <EducationBreadcrumb basePath={basePath} current={article.title} />

        <header className="mt-8">
          <p className="font-instrument-sans text-ee-accent-contrast text-[12px] font-semibold uppercase tracking-[0.18em]">
            {EDUCATION_KIND_LABELS[article.kind] ?? "Edukacija"}
          </p>

          <h1 className="font-newsreader text-ee-accent mt-3 text-[clamp(32px,4.4vw,54px)] leading-[1.06] tracking-[-0.022em]">
            {article.title}
          </h1>

          {article.description && (
            <p className="font-instrument-sans text-ee-text-muted mt-5 max-w-[54ch] text-[18px] leading-[1.7]">
              {article.description}
            </p>
          )}

          <p className="font-instrument-sans text-ee-text-muted mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <time dateTime={article.publishedAt}>{publishedLabel}</time>
            {readingTime && (
              <>
                <span aria-hidden="true">·</span>
                <span>{readingTime}</span>
              </>
            )}
            {author && (
              <>
                <span aria-hidden="true">·</span>
                <span>{author.name}</span>
              </>
            )}
          </p>
        </header>

        {article.coverImage && (
          <figure className="mt-10">
            <ContentImage
              src={article.coverImage}
              alt={article.title}
              className="aspect-[16/9] w-full rounded-[28px] object-cover"
            />
          </figure>
        )}

        {children ?? (
          <article className="mt-12 space-y-10">
            {/* Strana već nosi `h1`, pa blokovi počinju od `h2`. */}
            <BlockList blocks={article.blocks} headingScope="section" />
          </article>
        )}

        {author && <EducationAuthorBox author={author} />}
      </div>
    </div>
  );
}

export { educationAuthorFromSalon };
