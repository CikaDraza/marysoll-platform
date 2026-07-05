"use client";
/** SectionHeader — pomoćna komponenta Marketing taba (superadmin CMS). */


// ─── Section accordion ────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-slate-700 rounded-lg text-sm font-semibold text-white hover:bg-slate-600 transition"
    >
      <span>{title}</span>
      <span className="text-slate-400">{open ? "▲" : "▼"}</span>
    </button>
  );
}
