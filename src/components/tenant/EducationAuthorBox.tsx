import { ContentImage } from "@/components/content-composer/blocks/ContentImage";
import type { EducationAuthor } from "@/lib/education/presentation";

export function EducationAuthorBox({ author }: { author: EducationAuthor }) {
  return (
    <aside
      aria-label="O autoru"
      className="border-ee-border bg-ee-surface mt-16 flex items-center gap-4 rounded-[24px] border p-6"
    >
      {author.image && (
        <ContentImage
          src={author.image}
          alt={author.name}
          className="size-14 shrink-0 rounded-full object-cover"
        />
      )}
      <div className="min-w-0">
        <p className="font-newsreader text-ee-accent text-[19px] leading-tight">
          {author.name}
        </p>
        {author.role && (
          <p className="font-instrument-sans text-ee-text-muted mt-1 text-[14px]">
            {author.role}
          </p>
        )}
      </div>
    </aside>
  );
}
