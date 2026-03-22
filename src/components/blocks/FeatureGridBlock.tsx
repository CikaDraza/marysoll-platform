// src/components/conversational/blocks/FeatureGridBlock.tsx
"use client";

import { LayoutBlockType } from "@/types/conversational/blocks";

interface Feature {
  title: string;
  description: string;
}

interface Props {
  block: Extract<LayoutBlockType, { type: "FeatureGridBlock" }>;
}

export function FeatureGridBlock({ block }: Props) {
  const { id, visibility, features = [] as Feature[], columns } = block;
  if (visibility === "hidden" && !features) return null;

  return (
    <section id={id} className="py-16 w-full">
      <div
        className={`mx-auto max-w-6xl grid grid-cols-${columns} gap-8 px-2 py-18 sm:py-24 lg:px-4`}
      >
        {features.map((f, i) => (
          <div
            key={i}
            className="mx-auto max-w-4xl lg:max-w-7xl px-8 py-10 sm:py-12 lg:px-12 bg-gray-800 rounded-xl"
          >
            <h3 className="text-base/7 font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-300 sm:mt-3">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
