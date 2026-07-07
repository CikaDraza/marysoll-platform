"use client";

import { useSuperAdminDiagnostics } from "@/hooks/useSuperAdminDiagnostics";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
} from "@/components/superadmin/shared";
import toast from "react-hot-toast";
import {
  DIAG_NULL_LABEL,
  type DiagLabelSummary,
  type DiagModuleResult,
  type DiagReportDTO,
} from "@/types/diagnostics";
import {
  exportMarkdown,
  exportPdf,
  exportText,
} from "@/lib/diagnostics/exportReport";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sr-RS");
  } catch {
    return iso;
  }
}

const STATE_STYLE: Record<DiagModuleResult["state"], { cls: string; label: string }> =
  {
    ok: { cls: "bg-emerald-900/60 text-emerald-300 border-emerald-700", label: "OK" },
    fail: { cls: "bg-red-900/60 text-red-300 border-red-700", label: "GREŠKA" },
    warn: { cls: "bg-amber-900/60 text-amber-300 border-amber-700", label: "UPOZORENJE" },
    info: { cls: "bg-sky-900/60 text-sky-300 border-sky-700", label: "INFO" },
    pending: { cls: "bg-slate-700 text-slate-300 border-slate-600", label: "…" },
  };

function StateBadge({ state }: { state: DiagModuleResult["state"] }) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.info;
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function optionText(l: DiagLabelSummary): string {
  const name = l.label ?? "(bez oznake)";
  return `${name} — ${l.count} ${l.count === 1 ? "izveštaj" : "izveštaja"} · ${fmtDate(l.lastAt)}`;
}

function optionValue(l: DiagLabelSummary): string {
  return l.label ?? DIAG_NULL_LABEL;
}

// ─── Jedan modul unutar izveštaja ─────────────────────────────────────────────
function ModuleRow({ m }: { m: DiagModuleResult }) {
  const hasData = m.data && Object.keys(m.data).length > 0;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 py-2 border-b border-slate-700/60 last:border-0">
      <div className="flex items-center gap-2 sm:w-44 sm:flex-shrink-0">
        <StateBadge state={m.state} />
        <span className="text-xs font-semibold text-white break-words">
          {m.name}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        {m.detail && (
          <p className="text-xs text-slate-300 break-words">{m.detail}</p>
        )}
        {hasData && (
          <pre className="mt-1 text-[10px] leading-relaxed text-slate-400 bg-slate-900/60 rounded p-2 overflow-x-auto">
            {JSON.stringify(m.data, null, 2)}
          </pre>
        )}
      </div>
      {m.ms != null && (
        <span className="text-[10px] text-slate-500 sm:flex-shrink-0">
          {m.ms} ms
        </span>
      )}
    </div>
  );
}

// ─── Jedan izveštaj (jedan DiagReport dokument) ───────────────────────────────
function ReportCard({ r, index }: { r: DiagReportDTO; index: number }) {
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span className="text-sm font-bold text-white">#{index + 1}</span>
        <span className="text-xs text-slate-400">{fmtDate(r.createdAt)}</span>
        {r.pageHost && (
          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full break-all">
            {r.pageHost}
          </span>
        )}
        {r.country && (
          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
            {r.country}
          </span>
        )}
      </div>

      {/* Meta */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs">
        <div className="flex gap-2">
          <dt className="text-slate-500 flex-shrink-0">IP:</dt>
          <dd className="text-slate-300 break-all">{r.ip ?? "—"}</dd>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <dt className="text-slate-500 flex-shrink-0">Uređaj:</dt>
          <dd className="text-slate-300 break-all">{r.userAgent ?? "—"}</dd>
        </div>
      </dl>

      {/* Moduli */}
      {r.results && r.results.length > 0 ? (
        <div className="rounded-lg bg-slate-800/60 border border-slate-700 px-3">
          {r.results.map((m, i) => (
            <ModuleRow key={`${m.key}-${i}`} m={m} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">Bez modula u izveštaju.</p>
      )}
    </div>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────
export function DijagnostikaTab() {
  const {
    labels,
    selectedValue,
    selectedLabelText,
    selectLabel,
    reports,
    loadingLabels,
    loadingReports,
    error,
    refresh,
  } = useSuperAdminDiagnostics();

  const canExport = reports.length > 0 && selectedLabelText !== null;
  const exportLabel = selectedLabelText ?? "izvestaj";

  const runExport = (
    fn: (label: string, reports: DiagReportDTO[]) => void,
    format: string,
  ) => {
    try {
      fn(exportLabel, reports);
      toast.success(`Izveštaj preuzet (${format}).`);
    } catch {
      toast.error(`Izvoz (${format}) nije uspeo.`);
    }
  };

  const exportBtn =
    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6 max-w-full">
      {/* Header + export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Dijagnostika</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Izveštaji samouslužne dijagnostike sa uređaja korisnika. Pošto
            izveštaji još nemaju ID salona, grupisani su po oznaci (
            <code className="text-slate-300">?u=</code> iz support linka).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
          <button
            onClick={() => runExport(exportText, "TXT")}
            disabled={!canExport}
            className={`${exportBtn} bg-slate-700 text-white hover:bg-slate-600`}
            title="Preuzmi kao .txt"
          >
            <DocumentTextIcon className="size-4" /> Text
          </button>
          <button
            onClick={() => runExport(exportMarkdown, "MD")}
            disabled={!canExport}
            className={`${exportBtn} bg-slate-700 text-white hover:bg-slate-600`}
            title="Preuzmi kao .md"
          >
            <ArrowDownTrayIcon className="size-4" /> MD
          </button>
          <button
            onClick={() => runExport(exportPdf, "PDF")}
            disabled={!canExport}
            className={`${exportBtn} bg-violet-600 text-white hover:bg-violet-500`}
            title="Preuzmi kao PDF (štampa)"
          >
            <ArrowDownTrayIcon className="size-4" /> PDF
          </button>
        </div>
      </div>

      {/* Select */}
      <div className={card}>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="font-semibold text-sm text-white">Izaberi salon</h3>
          <button
            onClick={() => void refresh()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            title="Osveži"
          >
            <ArrowPathIcon
              className={`size-4 ${loadingLabels ? "animate-spin" : ""}`}
            />
            Osveži
          </button>
        </div>
        <select
          className={inp}
          value={selectedValue}
          onChange={(e) => void selectLabel(e.target.value)}
          disabled={loadingLabels}
        >
          <option value="">— Izaberite oznaku —</option>
          {labels.map((l) => (
            <option key={optionValue(l)} value={optionValue(l)}>
              {optionText(l)}
            </option>
          ))}
        </select>

        {!loadingLabels && labels.length === 0 && (
          <p className="text-xs text-slate-500 mt-3">
            Još nema dijagnostičkih izveštaja u bazi.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Reports */}
      {loadingReports ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 px-1">
          <ArrowPathIcon className="size-4 animate-spin" />
          Učitavanje izveštaja…
        </div>
      ) : selectedValue && reports.length === 0 && !error ? (
        <p className="text-sm text-slate-500 px-1">
          Nema izveštaja za ovu oznaku.
        </p>
      ) : (
        <div className="space-y-4">
          {reports.map((r, i) => (
            <ReportCard key={r._id} r={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
