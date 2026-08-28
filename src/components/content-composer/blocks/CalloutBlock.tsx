import type { CalloutBlock as CalloutBlockType } from "@/lib/content/schemas/landing-blocks";

const LABEL = { info: "Informacija", tip: "Savet", warning: "Upozorenje", important: "Važno" } as const;
const SYMBOL = { info: "i", tip: "✓", warning: "!", important: "★" } as const;

export default function CalloutBlock({ block }: { block: CalloutBlockType }) {
  return <aside id={block.id} aria-label={LABEL[block.variant]} className="mx-auto my-10 max-w-4xl border-l-4 border-gray-900 bg-gray-50 px-6 py-5 text-gray-950">
    <p className="text-xs font-bold uppercase tracking-wider"><span aria-hidden="true">{SYMBOL[block.variant]} </span>{LABEL[block.variant]}</p>
    {block.title && <h2 className="mt-2 text-xl font-bold">{block.title}</h2>}
    <p className="mt-2 whitespace-pre-line leading-7">{block.content}</p>
  </aside>;
}
