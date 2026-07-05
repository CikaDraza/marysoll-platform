"use client";
/** PageModal — pomoćna komponenta Marketing taba (superadmin CMS). */
import type { CmsPage } from "@/types/marketing-landing";
import { useState } from "react";
import {
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";

// ─── Pages modal ──────────────────────────────────────────────────────────────

export function PageModal({
  page,
  onClose,
  onSave,
  isSaving,
}: {
  page: CmsPage | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    slug?: string;
    content: string;
  }) => Promise<void>;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="font-bold text-white">
            {page ? "Uredi stranicu" : "Nova stranica"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!page && (
            <div>
              <label className={lbl}>Naziv stranice</label>
              <input
                className={inp}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="npr. Politika privatnosti"
              />
            </div>
          )}
          <div className="flex-1">
            <label className={lbl}>Sadržaj (Markdown)</label>
            <textarea
              className={`${inp} font-mono text-xs`}
              rows={20}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"# Naslov\n\n## Sekcija\n\nTekst..."}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end px-5 py-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 text-sm hover:text-white"
          >
            Otkaži
          </button>
          <button
            className={btnPrimary}
            disabled={isSaving || (!page && !title.trim())}
            onClick={async () => {
              await onSave({ title, content, slug: page?.slug });
              onClose();
            }}
          >
            {isSaving ? "Čuvanje..." : "Sačuvaj"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main MarketingTab ────────────────────────────────────────────────────────
