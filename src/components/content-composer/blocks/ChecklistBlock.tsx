import type { ChecklistBlock as ChecklistBlockType } from "@/lib/content/schemas/landing-blocks";

export default function ChecklistBlock({ block }: { block: ChecklistBlockType }) {
  return <section id={block.id} className="px-6 py-12 text-gray-950 lg:px-8"><div className="mx-auto max-w-4xl">
    {block.title && <h2 className="mb-5 text-2xl font-bold">{block.title}</h2>}
    <ul className="space-y-3">{(Array.isArray(block.items) ? block.items : []).map((item) => <li key={item.id} className="flex gap-3"><span aria-hidden="true" className="font-bold">✓</span><span>{item.text}</span></li>)}</ul>
  </div></section>;
}
