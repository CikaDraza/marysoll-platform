// Shared Content Composer preview frame.
"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BlockList } from "@/components/content-composer/BlockList";
import { LandingBlock } from "@/lib/content/schemas/landing-blocks";

interface PreviewRendererProps {
  blocks: LandingBlock[];
  header?: ReactNode;
  metadata?: ReactNode;
}

// Composed pages are responsive — preview at mobile width so the whole page
// fits inside a narrow host panel without horizontal scrolling.
const MOBILE_PREVIEW_WIDTH = 390;

function MobilePreviewFrame({ children }: { children: ReactNode }) {
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
        width: ${MOBILE_PREVIEW_WIDTH}px;
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
        title="Mobilni landing preview"
        className="block border-0 bg-white"
        style={{
          width: MOBILE_PREVIEW_WIDTH,
          height,
        }}
      />
      {mountNode &&
        createPortal(
          <main
            style={{
              width: MOBILE_PREVIEW_WIDTH,
              minWidth: MOBILE_PREVIEW_WIDTH,
            }}
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
  blocks,
  header,
  metadata,
}: PreviewRendererProps) {
  return (
    <div className="mt-6 space-y-8">
      {header}
      {metadata}

      <section aria-label="Mobilni landing preview" className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Mobilni pregled
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto" style={{ width: MOBILE_PREVIEW_WIDTH }}>
            <MobilePreviewFrame>
              <BlockList blocks={blocks} />
            </MobilePreviewFrame>
          </div>
        </div>
      </section>
    </div>
  );
}
