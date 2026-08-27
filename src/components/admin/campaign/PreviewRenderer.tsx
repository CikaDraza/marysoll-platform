"use client";

import Image from "next/image";
import { PreviewRenderer as ContentPreviewRenderer } from "@/components/content-composer/PreviewRenderer";
import type { LandingBlock } from "@/lib/content/schemas/landing-blocks";
import type { LandingSeo } from "@/types/newsletter";

interface Props {
  blocks: LandingBlock[];
  seo?: LandingSeo;
  isSeoLoading?: boolean;
  isSeoReady?: boolean;
}

function NewsletterSeoPanel({
  seo,
  isLoading,
  isReady,
}: {
  seo?: LandingSeo;
  isLoading: boolean;
  isReady: boolean;
}) {
  return (
    <aside className="space-y-1 rounded-xl bg-white p-4 text-xs shadow dark:bg-gray-800">
      {isLoading ? (
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
          <span className="font-semibold">Generisanje SEO podataka...</span>
        </div>
      ) : isReady && seo ? (
        <>
          <span className="mb-3 inline-block rounded border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
            SEO Loaded
          </span>
          <div><b>SEO Title:</b> {seo.title}</div>
          <div><b>Description:</b> {seo.description}</div>
          <div><b>Keywords:</b> {seo.keywords?.join(", ")}</div>
          <div><b>OG Title:</b> {seo.ogTitle}</div>
          {seo.ogImage && (
            <figure className="relative mt-2 h-24 w-40 overflow-hidden rounded shadow-sm">
              <Image src={seo.ogImage} alt="OG Preview" fill className="object-cover" />
            </figure>
          )}
        </>
      ) : (
        <div className="italic text-gray-400">
          SEO podaci će biti generisani nakon kreiranja landing-a
        </div>
      )}
    </aside>
  );
}

/** Newsletter-only adapter around the domain-neutral Content Composer preview. */
export function PreviewRenderer({
  blocks,
  seo,
  isSeoLoading = false,
  isSeoReady = false,
}: Props) {
  return (
    <ContentPreviewRenderer
      blocks={blocks}
      header={<h6 className="text-sm font-semibold">Newsletter stranica za pregled.</h6>}
      metadata={
        <NewsletterSeoPanel
          seo={seo}
          isLoading={isSeoLoading}
          isReady={isSeoReady}
        />
      }
    />
  );
}
