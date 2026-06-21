"use client";

/**
 * Theme8BlogList — Y2K /blogs inner page: graffiti polaroid blog cards.
 * Reuses the same data source as BlogsPageClient (useBlogPosts + Paginator),
 * restyled to the Theme-8 aesthetic. theme-8 only.
 */
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Paginator from "@/components/elements/Paginator";
import { useBlogPosts } from "@/hooks/newsletter/useBlogPosts";
import { useClientRouting } from "@/hooks/useClientRouting";
import { FadeUp } from "../FadeUp";
import { Deco } from "../Decorations";

const LIMIT = 9;
const CARD_SHADOWS = ["#ff2e97", "#8B16C9", "#ff5fd2"];
const CARD_ROTATE = ["rotate-[-1.5deg]", "rotate-[1deg]", "rotate-[-0.5deg]"];

export function Theme8BlogList() {
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const { path } = useClientRouting();
  const { posts, pagination, isLoading, handlePageChange } = useBlogPosts({
    page,
    limit: LIMIT,
  });

  return (
    <div className="max-w-[1180px] mx-auto px-5 pt-12 pb-14">
      <FadeUp className="relative text-center mb-10">
        <Deco
          shape="sparkle"
          size={40}
          motionType="twinkle"
          className="absolute left-[8%] top-0 hidden sm:block"
        />
        <span className="inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink">
          Novosti & saveti
        </span>
        <h1 className="mt-1.5 font-bagel text-[clamp(44px,8vw,96px)] leading-[0.9] text-white [-webkit-text-stroke:3px_#0b0b0f] [text-shadow:5px_6px_0_rgba(255,46,151,0.7)] rotate-[-1deg]">
          THE BLOG
        </h1>
      </FadeUp>

      {!isLoading && posts.length === 0 && (
        <p className="text-center font-bagel text-2xl text-white/80 py-20">
          Trenutno nema blogova ♡
        </p>
      )}

      {posts.length > 0 && (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <FadeUp key={post._id} delay={(i % 3) * 0.06}>
              <Link
                href={path(`/blog/${post.slug}`)}
                className={`group block bg-white border-[3px] border-y2k-ink rounded-[18px] overflow-hidden ${CARD_ROTATE[i % 3]} hover:-translate-y-1 transition-transform duration-200`}
                style={{ boxShadow: `6px 8px 0 ${CARD_SHADOWS[i % 3]}` }}
              >
                <div className="relative h-[200px] border-b-[3px] border-y2k-ink overflow-hidden">
                  {post.ogImage ? (
                    <Image
                      src={post.ogImage}
                      alt={post.title}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#8B16C9,#ff2e97)]">
                      <span className="font-bagel text-5xl text-white">
                        {post.initials}
                      </span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-y2k-ink text-white text-[11px] font-extrabold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full rotate-[-3deg]">
                    {post.categoryTitle}
                  </span>
                </div>
                <div className="p-5">
                  <time
                    dateTime={post.dateISO}
                    className="text-[12px] font-bold text-[#9a7d8b]"
                  >
                    {post.dateFormatted}
                  </time>
                  <h3 className="mt-1.5 font-bagel text-[22px] leading-[1.05] text-y2k-ink group-hover:text-y2k-pink transition-colors">
                    {post.title}
                  </h3>
                  <p className="mt-2.5 line-clamp-3 text-[14px] leading-[1.5] font-medium text-[#4a3340]">
                    {post.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-y2k-pink group-hover:gap-2.5 transition-all">
                    Pročitaj →
                  </span>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      )}

      {pagination.totalCount > LIMIT && (
        <div className="mt-12">
          <Paginator pagination={pagination} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}
