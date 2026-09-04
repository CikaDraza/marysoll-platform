// Shared Content Composer preview frame.
"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BlockList } from "@/components/content-composer/BlockList";
import { LandingBlock } from "@/lib/content/schemas/landing-blocks";
import { prepareEditorPreview } from "@/lib/content/render/prepareEditorPreview";

export type PreviewViewport = "mobile" | "desktop";

interface PreviewRendererProps {
  blocks: LandingBlock[];
  header?: ReactNode;
  metadata?: ReactNode;
  /**
   * Širine koje host nudi. Newsletter ostaje na samo mobilnom pregledu —
   * podrazumevana vrednost mu čuva zatečeno ponašanje.
   */
  viewports?: readonly PreviewViewport[];
}

// Composed pages are responsive — preview at mobile width so the whole page
// fits inside a narrow host panel without horizontal scrolling.
const MOBILE_PREVIEW_WIDTH = 390;
const DESKTOP_PREVIEW_WIDTH = 1280;

const VIEWPORT_WIDTH: Record<PreviewViewport, number> = {
  mobile: MOBILE_PREVIEW_WIDTH,
  desktop: DESKTOP_PREVIEW_WIDTH,
};

const VIEWPORT_LABEL: Record<PreviewViewport, string> = {
  mobile: "Mobilni",
  desktop: "Desktop",
};

function MobilePreviewFrame({
  children,
  width,
}: {
  children: ReactNode;
  width: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(480);

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
        width: ${width}px;
        background: white;
        overflow: hidden;
      }
      * {
        box-sizing: border-box;
      }
    `;
    doc.head.appendChild(style);

    setMountNode(doc.body);
  }, [width]);

  useEffect(() => {
    if (!mountNode) return;

    const doc = mountNode.ownerDocument;
    const updateHeight = () => {
      setHeight(Math.max(480, doc.documentElement.scrollHeight));
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
        title="Pregled sadržaja"
        className="block border-0 bg-white"
        style={{ width, height }}
      />
      {mountNode &&
        createPortal(
          <main
            style={{ width, minWidth: width }}
            className="bg-white"
          >
            {children}
          </main>,
          mountNode,
        )}
    </>
  );
}

export function PreviewRenderer({
  blocks: sourceBlocks,
  header,
  metadata,
  viewports = ["mobile"],
}: PreviewRendererProps) {
  const { blocks, unavailable } = prepareEditorPreview(sourceBlocks);
  const [viewport, setViewport] = useState<PreviewViewport>(viewports[0]);
  const active = viewports.includes(viewport) ? viewport : viewports[0];
  const width = VIEWPORT_WIDTH[active];

  return (
    <div className="mt-6 space-y-8">
      {header}
      {metadata}

      <section aria-label="Pregled sadržaja" className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Pregled
          </div>
          {viewports.length > 1 && (
            <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
              {viewports.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setViewport(option)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    option === active
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {VIEWPORT_LABEL[option]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Desktop širina se skalira da stane u panel; renderer je isti. */}
          <div className="mx-auto w-fit" style={{ width }}>
            <MobilePreviewFrame key={active} width={width}>
              {unavailable.length > 0 && (
                <div className="m-4 space-y-2" role="status">
                  {unavailable.map((block, index) => (
                    <div
                      key={`${block.blockId}-${index}`}
                      className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
                    >
                      <strong>{block.blockType}</strong>
                      <p>Dopunite blok za prikaz.</p>
                    </div>
                  ))}
                </div>
              )}
              <BlockList blocks={blocks} />
            </MobilePreviewFrame>
          </div>
        </div>
      </section>
    </div>
  );
}
