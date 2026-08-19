"use client";
/**
 * Theme9LatestEducation — poslednji stručni tekstovi („Latest Education").
 *
 * Prototip je ovu sekciju crtao sa tri statične kartice. Ovde je od početka
 * data-backed: `useBlogPosts({ limit: 3 })` vraća stvarne objave tenanta, pa se
 * sekcija ne mora ručno održavati. Naslov i uvod dolaze iz `content.blog`.
 *
 * Bez ijedne objave grid se ne renderuje — ostaje samo zaglavlje sa linkom ka
 * `/blogs`, umesto praznog rama.
 */
import Image from "next/image";
import Link from "next/link";
import { useBlogPosts } from "@/hooks/newsletter/useBlogPosts";
import { ArrowCircle, Chip, Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9LatestEducationProps {
  headline?: string;
  paragraph?: string;
  tenantSlug?: string;
}

export function Theme9LatestEducation({
  headline,
  paragraph,
  tenantSlug,
}: Theme9LatestEducationProps) {
  const { posts, isLoading } = useBlogPosts({ limit: 3 });
  const base = tenantSlug ? `/${tenantSlug}` : "";

  if (!headline && posts.length === 0) return null;

  return (
    <section id="edukacija" className="bg-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[46ch] flex-col gap-3">
            <Eyebrow>Edukacija</Eyebrow>
            {headline && (
              <h2 className="font-newsreader text-ee-accent text-[clamp(30px,3.7vw,52px)] leading-[1.05] tracking-[-0.024em]">
                {headline}
              </h2>
            )}
            {paragraph && (
              <p className="font-instrument-sans text-ee-text-muted text-[15.5px] leading-[1.7]">
                {paragraph}
              </p>
            )}
          </div>

          <Link
            href={`${base}/blogs`}
            className="font-instrument-sans text-ee-accent text-[14.5px] underline underline-offset-[5px] hover:no-underline"
          >
            Svi tekstovi
          </Link>
        </Reveal>

        {posts.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4 lg:gap-[26px]">
            {posts.map((post, i) => (
              <Reveal key={post._id} delay={i * 70}>
                <article className="group flex h-full flex-col gap-3">
                  <Link href={`${base}/blogs/${post.slug}`} className="flex flex-col gap-3">
                    <div className="bg-ee-surface-muted relative aspect-[4/3] overflow-hidden rounded-[20px]">
                      {post.ogImage ? (
                        <Image
                          src={post.ogImage}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
                        />
                      ) : (
                        <span className="font-newsreader text-ee-sage absolute inset-0 flex items-center justify-center text-[34px]">
                          {post.initials}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Chip variant="tag">{post.categoryTitle}</Chip>
                      <span className="text-ee-text-muted text-[12.5px]">
                        {post.dateFormatted}
                      </span>
                    </div>

                    <h3 className="font-newsreader text-ee-accent text-[clamp(20px,2vw,27px)] leading-snug">
                      {post.title}
                    </h3>

                    {post.description && (
                      <p className="font-instrument-sans text-ee-text-muted text-[14.5px] leading-[1.65]">
                        {post.description}
                      </p>
                    )}

                    <span className="mt-1 inline-flex">
                      <ArrowCircle size={30} />
                    </span>
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        )}

        {isLoading && posts.length === 0 && (
          <p className="font-instrument-sans text-ee-text-muted text-[14px]">
            Učitavanje…
          </p>
        )}
      </div>
    </section>
  );
}
