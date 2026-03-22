// src/components/admin/campaign/PreviewRenderer.tsx
"use client";

import Image from "next/image";
import { LayoutBlock } from "@/types/conversational/layout";
import { LandingSeo } from "@/types/newsletter";

interface PreviewRendererProps {
  blocks: LayoutBlock[];
  seo?: LandingSeo;
  isSeoLoading?: boolean;
  isSeoReady?: boolean;
}

function hasImages(arr?: string[]): boolean {
  return Array.isArray(arr) && arr.length > 0 && Boolean(arr[0]);
}

export function PreviewRenderer({
  blocks,
  seo,
  isSeoLoading = false,
  isSeoReady = false,
}: PreviewRendererProps) {
  return (
    <div className="space-y-8 mt-6">
      <div className="text-sm font-semibold">
        <h6>Newsletter stranica za pregled.</h6>
      </div>

      {/* SEO Section with Loading State */}
      <div className="rounded-xl shadow bg-white p-4 text-xs space-y-1">
        {isSeoLoading ? (
          <div className="flex items-center gap-2 text-purple-600">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-semibold">Generisanje SEO podataka...</span>
          </div>
        ) : isSeoReady && seo ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase">
                ✓ SEO Loaded
              </span>
            </div>
            <div>
              <b>SEO Title:</b> {seo.title}
            </div>
            <div>
              <b>Description:</b> {seo.description}
            </div>
            <div>
              <b>Keywords:</b> {seo.keywords?.join(", ")}
            </div>
            <div>
              <b>OG Title:</b> {seo.ogTitle}
            </div>
            {seo.ogImage && (
              <div className="mt-2">
                <b>OG Image Preview:</b>
                <div className="mt-1 h-24 w-40 relative rounded shadow-sm overflow-hidden">
                  <Image
                    src={seo.ogImage}
                    alt="OG Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-400 italic">
            SEO podaci će biti generisani nakon kreiranja landing-a
          </div>
        )}
      </div>

      {/* Layout Blocks */}
      {blocks.map((block) => {
        switch (block.type) {
          case "HeroPrimaryBlock":
            return (
              <div key={block.id} className="p-6 bg-gray-200 rounded-xl">
                <h1 className="text-2xl! font-bold">{block.title}</h1>
                <p className="text-gray-600">{block.subtitle}</p>
              </div>
            );

          case "HeroVisualBlock":
            if ("imagesUrl" in block && !hasImages(block.imagesUrl)) {
              return null;
            }
            return (
              <div key={block.id} className="p-6 bg-gray-200 rounded-xl">
                <h1 className="text-2xl! font-bold">{block.title}</h1>
                <p className="text-gray-600">{block.subtitle}</p>
                <div className="flex items-center gap-3 mt-4">
                  {block.imagesUrl?.map((image: string, i: number) => (
                    <div
                      key={image}
                      className="h-46 w-30 overflow-hidden rounded-lg"
                    >
                      <Image
                        width={200}
                        height={200}
                        src={image}
                        alt={`${block.title} - ${i}`}
                        className="rounded-xl object-cover shadow-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );

          case "ArticleSectionBlock":
            return (
              <div key={block.id} className="p-6 bg-gray-200 rounded-xl">
                <p>{block.content}</p>
              </div>
            );

          case "ContentSplitBlock":
            return (
              <div key={block.id} className="p-6 bg-gray-200 rounded-xl">
                <h3 className="text-2xl font-semibold">{block.heading}</h3>
                <p className="leading-relaxed text-muted-foreground">
                  {block.content}
                </p>
              </div>
            );

          case "FeatureGridBlock":
            return (
              <div key={block.id} className="p-6 bg-gray-200 rounded-xl">
                <ul className="grid gap-4">
                  {block.features?.map(
                    (f: { title: string; description: string }, i: number) => (
                      <li key={i}>
                        <strong>{f.title}</strong>
                        <p>{f.description}</p>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            );

          case "CTABlock":
            return (
              <div key={block.id} className="p-6 bg-gray-200 rounded-xl">
                <div
                  className={`${
                    block.variant === "primary"
                      ? "cursor-pointer flex w-full justify-center rounded-md bg-(--secondary-color) px-6 py-4 text-sm/6 font-semibold text-white hover:bg-(--secondary-color)/80"
                      : "cursor-pointer mt-3 inline-flex w-full justify-center rounded-md bg-white px-6 py-4 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50"
                  } mx-auto`}
                >
                  Label: {block.label} - Link: {block.href}
                </div>
              </div>
            );

          case "PricingBlock":
            return (
              <div key={block.id} className="p-6 bg-gray-200 rounded-xl">
                <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6">
                  {block.plans?.map(
                    (plan: {
                      id: string;
                      name: string;
                      price: number | string;
                      description?: string;
                      ctaLabel?: string;
                      href?: string;
                    }) => (
                      <div
                        key={plan.id}
                        className="relative bg-gray-900 shadow-2xl rounded-3xl p-8 ring-1 ring-gray-900/10"
                      >
                        <h3 className="text-(--secondary-color) text-base/7 font-semibold">
                          {plan.name}
                        </h3>
                        <p className="mt-4 flex items-baseline gap-x-2">
                          <span className="text-white text-4xl font-semibold tracking-tight">
                            {plan.price}
                          </span>
                        </p>
                        <p className="text-gray-300 mt-6 text-base/7">
                          {plan.description}
                        </p>
                        <div className="bg-(--secondary-color) text-white shadow-xs hover:bg-(--secondary-color)/90 mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold">
                          {plan.ctaLabel} {plan.href}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
