"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { useBlogPosts } from "@/hooks/newsletter/useBlogPosts";

interface Props {
  headline?: string;
  paragraph?: string;
  tenantSlug?: string;
  authorName?: string;
  authorImage?: string;
}

export function BlogSection({
  headline,
  paragraph,
  tenantSlug,
  authorName,
  authorImage,
}: Props) {
  const { posts, isLoading } = useBlogPosts({ limit: 3 });

  const base = tenantSlug ? `/${tenantSlug}` : "";

  if (isLoading)
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <article
              key={i}
              className="group relative flex w-full flex-col bg-white p-6 rounded-lg shadow"
            >
              <div className="flex flex-wrap animate-pulse">
                <div className="w-full h-33 rounded-xl mb-4 bg-gray-200"></div>
                <div className="flex-1 space-y-6 py-1">
                  <div className="h-2 rounded bg-gray-200"></div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 h-2 rounded bg-gray-200"></div>
                      <div className="col-span-1 h-2 rounded bg-gray-200"></div>
                    </div>
                    <div className="h-2 rounded bg-gray-200"></div>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <div className="size-10 rounded-full bg-gray-200"></div>
                    <div className="h-2 flex-1 rounded bg-gray-200"></div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    );

  return (
    <section className="bg-[#FAF8F5] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {headline || "Novosti i Artikli"}
          </h2>
          {paragraph && (
            <p className="mt-2 text-base text-gray-500">{paragraph}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post._id} className="group relative flex flex-col">
              {post.ogImage && (
                <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                  <Image
                    src={post.ogImage}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}

              <div className="flex items-center gap-x-3 text-xs text-gray-500">
                <time dateTime={post.dateISO}>{post.dateFormatted}</time>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600">
                  {post.categoryTitle}
                </span>
              </div>

              <div className="mt-3 flex flex-col grow">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-600 line-clamp-2">
                  <Link href={`${base}/blogs/${post.slug}`}>
                    <span className="absolute inset-0" />
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-gray-500">
                  {post.description}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-x-3">
                {authorImage ? (
                  <Image
                    src={authorImage}
                    alt={authorName ?? post.title}
                    width={32}
                    height={32}
                    className="size-8 rounded-full object-cover bg-gray-100"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-(--secondary-color) flex items-center justify-center text-white text-[10px] font-semibold">
                    {authorName ? authorName[0].toUpperCase() : post.initials}
                  </div>
                )}
                {authorName && (
                  <span className="text-sm font-medium text-gray-900">
                    {authorName}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href={`${base}/blogs`}
            className="bg-black px-6 py-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
          >
            Pogledaj više
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
