// src/components/conversational/blocks/ArticleSectionBlock.tsx
"use client";

import { LayoutBlockType } from "@/types/conversational/blocks";

interface Props {
  block: Extract<LayoutBlockType, { type: "ArticleSectionBlock" }>;
}

export function ArticleSectionBlock({ block }: Props) {
  const { id, visibility, className, title, content } = block;

  if (visibility === "hidden") return null;

  return (
    <section
      id={id}
      className={`py-12 bg-background mx-auto ${className ?? ""}`}
    >
      <h2 className="text-base/7 font-semibold text-white">{title}</h2>
      <p className="max-w-xl text-base/7 text-justify text-gray-600 lg:max-w-7xl">
        {content}
      </p>
    </section>
  );
}
