import type { TableBlock as TableBlockType } from "@/lib/content/schemas/landing-blocks";

export default function TableBlock({ block }: { block: TableBlockType }) {
  const columns = Array.isArray(block.columns) ? block.columns : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  return <section id={block.id} className="px-6 py-12 text-gray-950 lg:px-8"><div className="mx-auto max-w-5xl">
    {block.title && <h2 className="mb-5 text-2xl font-bold">{block.title}</h2>}
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        {block.caption && <caption className="caption-bottom p-3 text-left text-gray-600">{block.caption}</caption>}
        <thead className="bg-gray-50"><tr>{columns.map((column) => <th key={column.id} scope="col" className="border-b px-4 py-3 font-semibold">{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.id} className="border-b px-4 py-3 align-top">{row.cells?.[column.id] ?? "—"}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </div></section>;
}
