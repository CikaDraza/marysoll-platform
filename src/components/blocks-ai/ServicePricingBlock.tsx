"use client";

import { PricingBlockType } from "@/types/landing-block";

interface Props {
  block: PricingBlockType;
}

export default function ServicePricingBlock({ block }: Props) {
  return (
    <section id={block.id} className="py-10">
      <div className="mx-auto max-w-5xl rounded-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold">Cenovnik usluga</h2>
        <p className="mt-2 text-sm text-gray-600">
          {block.query || "Usluge i cene"}
        </p>
      </div>
    </section>
  );
}
