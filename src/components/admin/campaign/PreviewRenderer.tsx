// src/components/admin/campaign/PreviewRenderer.tsx
"use client";

import Image from "next/image";
import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { blockRegistry } from "@/components/layout/blockRegistry";
import { LandingBlock } from "@/types/landing-blocks";
import { LandingSeo } from "@/types/newsletter";

interface PreviewRendererProps {
  blocks: LandingBlock[];
  seo?: LandingSeo;
  isSeoLoading?: boolean;
  isSeoReady?: boolean;
}

const DESKTOP_PREVIEW_WIDTH = 1280;

function renderBlock(block: LandingBlock) {
  switch (block.type) {
    case "HeroBlock": {
      const BlockView = blockRegistry.HeroBlock;
      return <BlockView key={block.id} block={block} />;
    }

    case "ArticleBlock": {
      const BlockView = blockRegistry.ArticleBlock;
      return <BlockView key={block.id} block={block} />;
    }

    case "FeatureBlock": {
      const BlockView = blockRegistry.FeatureBlock;
      return <BlockView key={block.id} block={block} />;
    }

    case "ContentSplitBlock": {
      const BlockView = blockRegistry.ContentSplitBlock;
      return <BlockView key={block.id} block={block} />;
    }

    case "PricingBlock": {
      const BlockView = blockRegistry.PricingBlock;
      return <BlockView key={block.id} block={block} />;
    }

    case "AffiliateCTABlock": {
      const BlockView = blockRegistry.AffiliateCTABlock;
      return <BlockView key={block.id} block={block} />;
    }

    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

function DesktopPreviewFrame({ children }: { children: ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(720);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write("<!doctype html><html><head></head><body></body></html>");
    doc.close();

    const base = doc.createElement("base");
    base.target = "_parent";
    doc.head.appendChild(base);

    document
      .querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
        'link[rel="stylesheet"], style',
      )
      .forEach((node) => {
        doc.head.appendChild(node.cloneNode(true));
      });

    const style = doc.createElement("style");
    style.textContent = `
      html, body {
        margin: 0;
        min-width: ${DESKTOP_PREVIEW_WIDTH}px;
        background: white;
        overflow: hidden;
      }
      * {
        box-sizing: border-box;
      }
    `;
    doc.head.appendChild(style);

    setMountNode(doc.body);
  }, []);

  useEffect(() => {
    if (!mountNode) return;

    const doc = mountNode.ownerDocument;
    const updateHeight = () => {
      setHeight(Math.max(720, doc.documentElement.scrollHeight));
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(doc.body);
    resizeObserver.observe(doc.documentElement);

    return () => resizeObserver.disconnect();
  }, [mountNode, children]);

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Desktop landing preview"
        className="block border-0 bg-white"
        style={{
          width: DESKTOP_PREVIEW_WIDTH,
          height,
        }}
      />
      {mountNode &&
        createPortal(
          <main className="w-[1280px] min-w-[1280px] bg-white">
            {children}
          </main>,
          mountNode,
        )}
    </>
  );
}

export function PreviewRenderer({
  blocks,
  seo,
  isSeoLoading = false,
  isSeoReady = false,
}: PreviewRendererProps) {
  const visibleBlocks = [...blocks]
    .filter((block) => block.visibility !== "hidden")
    .sort((a, b) => a.priority - b.priority);

  return (
    <div className="mt-6 space-y-8">
      <div className="text-sm font-semibold">
        <h6>Newsletter stranica za pregled.</h6>
      </div>

      <aside className="space-y-1 rounded-xl bg-white p-4 text-xs shadow">
        {isSeoLoading ? (
          <div className="flex items-center gap-2 text-purple-600">
            <svg
              className="h-4 w-4 animate-spin"
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
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-600">
                SEO Loaded
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
              <figure className="relative mt-2 h-24 w-40 overflow-hidden rounded shadow-sm">
                <Image
                  src={seo.ogImage}
                  alt="OG Preview"
                  fill
                  className="object-cover"
                />
              </figure>
            )}
          </>
        ) : (
          <div className="text-gray-400 italic">
            SEO podaci će biti generisani nakon kreiranja landing-a
          </div>
        )}
      </aside>

      <section aria-label="Desktop landing preview" className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Desktop preview 1280px
        </div>
        <div className="max-h-[70vh] w-full max-w-full overflow-auto rounded-lg border border-gray-200 bg-gray-100">
          <div className="w-[1280px] min-w-[1280px]">
            <DesktopPreviewFrame>
              {visibleBlocks.map(renderBlock)}
            </DesktopPreviewFrame>
          </div>
        </div>
      </section>
    </div>
  );
}
