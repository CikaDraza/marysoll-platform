// src/components/conversational/blocks/ContentSplitBlock.tsx
"use client";

import { LayoutBlockType } from "@/types/conversational/blocks";
import clsx from "clsx";

interface Props {
  block: Extract<LayoutBlockType, { type: "ContentSplitBlock" }>;
}

export function ContentSplitBlock({ block }: Props) {
  const { id, heading, content, align = "left", visibility } = block;
  if (visibility === "hidden") return null;

  return (
    <section id={id} className="py-14">
      <div
        className={clsx(
          "mx-auto max-w-5xl grid gap-8 px-6",
          align === "left"
            ? "md:grid-cols-[1fr_2fr]"
            : "md:grid-cols-[2fr_1fr]",
        )}
      >
        <h3 className="text-2xl font-semibold">{heading}</h3>
        <p className="leading-relaxed text-muted-foreground">{content}</p>
      </div>
    </section>
  );
}
