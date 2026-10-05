"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes, type PointerEvent } from "react";

export function ChatTextarea({ value, className = "", disabled, onPaste, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const manualHeight = useRef<number | null>(null);
  const drag = useRef<{ y: number; height: number } | null>(null);

  const resize = (requested?: number) => {
    const textarea = textareaRef.current;
    const frame = textarea?.closest<HTMLElement>("[data-chat-frame]");
    const composer = textarea?.closest<HTMLElement>("[data-chat-composer]");
    if (!textarea || !frame || !composer) return;
    const styles = getComputedStyle(textarea);
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.5;
    const chrome = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
      + parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const minimum = Math.max(40, lineHeight + chrome);
    const overhead = composer.offsetHeight - textarea.offsetHeight;
    const maximum = Math.max(minimum, frame.clientHeight * 0.7 - overhead);
    textarea.style.minHeight = `${minimum}px`;
    textarea.style.height = "0px";
    const automatic = Math.min(textarea.scrollHeight + parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth), lineHeight * 12 + chrome);
    textarea.style.height = `${Math.max(minimum, Math.min(requested ?? manualHeight.current ?? automatic, maximum))}px`;
  };

  useLayoutEffect(() => {
    if (!value) manualHeight.current = null;
    resize();
  }, [value]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const frame = textarea?.closest<HTMLElement>("[data-chat-frame]");
    if (!textarea || !frame) return;
    const observer = new ResizeObserver(() => resize());
    observer.observe(frame);
    const composer = textarea.closest<HTMLElement>("[data-chat-composer]");
    if (composer) observer.observe(composer);
    observer.observe(textarea, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const requested = drag.current.height + drag.current.y - event.clientY;
    resize(requested);
    manualHeight.current = textareaRef.current?.offsetHeight ?? null;
  };

  return (
    <div className="flex-1 min-w-0">
      <button
        type="button"
        aria-label="Promeni visinu polja za poruku"
        title="Povucite nagore za veće polje · strelice gore/dole menjaju visinu"
        disabled={disabled}
        className="flex h-4 w-full touch-none cursor-ns-resize items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-50"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          drag.current = { y: event.clientY, height: textareaRef.current?.offsetHeight ?? 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          resize((textareaRef.current?.offsetHeight ?? 0) + (event.key === "ArrowUp" ? 20 : -20));
          manualHeight.current = textareaRef.current?.offsetHeight ?? null;
        }}
      >
        <span aria-hidden="true" className="h-1 w-10 rounded-full bg-gray-400/60" />
      </button>
      <textarea {...props} ref={textareaRef} value={value} disabled={disabled} rows={1}
        onPaste={(event) => {
          // A new pasted draft grows automatically even after manual shrinking.
          manualHeight.current = null;
          onPaste?.(event);
        }}
        aria-label={props["aria-label"] ?? "Poruka"}
        className={`block w-full min-w-0 resize-none overflow-y-auto ${className}`} />
    </div>
  );
}
