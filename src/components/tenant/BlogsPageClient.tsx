"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Paginator from "@/components/elements/Paginator";
import { useBlogPosts } from "@/hooks/newsletter/useBlogPosts";
import { useClientRouting } from "@/hooks/useClientRouting";

const LIMIT = 9;

export default function BlogsPageClient() {
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const { path } = useClientRouting();

  const { posts, pagination, isLoading, handlePageChange } = useBlogPosts({
    page,
    limit: LIMIT,
  });

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h1 className="text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
            Novosti i Artikli
          </h1>
          <p className="mt-2 text-lg/8 text-gray-600">
            Pročitajte naše najnovije vesti, savete i stručne članke.
          </p>
        </div>

        {!isLoading && posts.length === 0 && (
          <p className="mt-16 text-center text-gray-500">
            Nema objavljenih članaka.
          </p>
        )}

        {posts.length > 0 && (
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 border-t border-gray-200 pt-10 sm:mt-16 sm:pt-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post._id}
                className="flex max-w-xl flex-col items-start justify-between"
              >
                <div className="flex items-center gap-x-4 text-xs">
                  <time dateTime={post.dateISO} className="text-gray-500">
                    {post.dateFormatted}
                  </time>
                  <span className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600">
                    {post.categoryTitle}
                  </span>
                </div>
                <div className="group relative grow">
                  <h3 className="mt-3 text-lg/6 font-semibold text-gray-900 group-hover:text-gray-600">
                    <Link href={path(`/blog/${post.slug}`)}>
                      <span className="absolute inset-0" />
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm/6 text-gray-600">
                    {post.description}
                  </p>
                </div>
                <div className="relative mt-8 flex items-center gap-x-4">
                  {post.ogImage ? (
                    <Image
                      width={40}
                      height={40}
                      alt={post.title}
                      src={post.ogImage}
                      className="size-10 rounded-full bg-gray-50 object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-(--secondary-color) flex items-center justify-center text-white text-xs font-semibold">
                      {post.initials}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {pagination.totalCount > LIMIT && (
          <div className="mt-10">
            <Paginator pagination={pagination} onPageChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
}
