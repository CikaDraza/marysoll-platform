"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Keep the message viewport full size while the composer covers its lower portion. */
export function ChatConversationFrame({ children, className = "" }: {
  children: ReactNode;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const composer = frame?.querySelector<HTMLElement>("[data-chat-composer]");
    const messages = frame?.querySelector<HTMLElement>("[data-chat-messages]");
    if (!frame || !composer || !messages) return;
    const update = () => {
      // Extra scroll space lets even the last message move above the composer.
      messages.style.paddingBottom = `${composer.offsetHeight + 16}px`;
      messages.style.scrollPaddingBottom = `${composer.offsetHeight + 16}px`;
    };
    const observer = new ResizeObserver(update);
    observer.observe(composer);
    update();
    return () => observer.disconnect();
  }, []);

  return <div ref={frameRef} data-chat-frame className={`relative flex-1 min-h-0 overflow-hidden ${className}`}>{children}</div>;
}
