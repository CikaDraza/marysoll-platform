"use client";

/**
 * Client Identity / Loyalty Integrity — server-side data-integrity provere
 * (Identity & Loyalty Health) unutar Dijagnostika taba. READ-ONLY: repair je
 * uvek samo tekst preporuke, nikad dugme koje menja podatke.
 *
 * Neizvršena provera (status "failed") se prikazuje kao posebno stanje
 * "NIJE IZVRŠENA" — nikad kao "0 problema".
 */

import { useSuperAdminIntegrity } from "@/hooks/useSuperAdminIntegrity";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
} from "@/components/superadmin/shared";
import type {
  IntegrityCheckResultDTO,
  IntegrityFindingDTO,
  IntegritySeverityDTO,
} from "@/types/diagnostics";
import { ArrowPathIcon, PlayIcon } from "@heroicons/react/24/outline";

const SEVERITY_STYLE: Record<
  IntegritySeverityDTO,
  { cls: string; label: string }
> = {
  error: { cls: "bg-red-900/60 text-red-300 border-red-700", label: "GREŠKA" },
  warning: {
    cls: "bg-amber-900/60 text-amber-300 border-amber-700",
    label: "UPOZORENJE",
  },
  info: { cls: "bg-sky-900/60 text-sky-300 border-sky-700", label: "INFO" },
};

const OK_STYLE = {
  cls: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
  label: "OK",
};
const FAILED_STYLE = {
  cls: "bg-fuchsia-900/60 text-fuchsia-300 border-fuchsia-700",
  label: "NIJE IZVRŠENA",
};

function badgeFor(result: IntegrityCheckResultDTO) {
  if (result.status === "failed") return FAILED_STYLE;
  if (result.severity) return SEVERITY_STYLE[result.severity];
  return OK_STYLE;
}

function Badge({ cls, label }: { cls: string; label: string }) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

/** Repair preporuka kao čitljiv tekst: action(param=vrednost, …). */
function repairText(repair: NonNullable<IntegrityFindingDTO["repair"]>): string {
  const params = Object.entries(repair.params ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  return params ? `${repair.action}(${params})` : repair.action;
}

function FindingRow({ finding }: { finding: IntegrityFindingDTO }) {
  const s = SEVERITY_STYLE[finding.severity];
  const hasEvidence =
    finding.evidence && Object.keys(finding.evidence).length > 0;
  return (
    <div className="py-2 border-b border-slate-700/60 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge cls={s.cls} label={s.label} />
        <span className="text-[10px] text-slate-500">
          {finding.subject.model} · {finding.subject.id}
        </span>
      </div>
      <p className="text-xs text-slate-300 mt-1 break-words">
        {finding.message}
      </p>
      {finding.repair && (
        <p className="text-[11px] text-violet-300 mt-1">
          Preporuka: <code>{repairText(finding.repair)}</code>
        </p>
      )}
      {hasEvidence && (
        <pre className="mt-1 text-[10px] leading-relaxed text-slate-400 bg-slate-900/60 rounded p-2 overflow-x-auto">
          {JSON.stringify(finding.evidence, null, 2)}
        </pre>
      )}
    </div>
  );
}

function CheckRow({ result }: { result: IntegrityCheckResultDTO }) {
  const badge = badgeFor(result);
  const truncated = result.totalFindings > result.findings.length;

  return (
    <div className="py-2 border-b border-slate-700/60 last:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
        <div className="flex items-center gap-2 sm:w-56 sm:flex-shrink-0">
          <Badge cls={badge.cls} label={badge.label} />
          <span className="text-xs font-semibold text-white break-words">
            {result.name}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-xs text-slate-400">
          {result.status === "failed" ? (
            <span className="text-fuchsia-300">{result.error}</span>
          ) : result.totalFindings === 0 ? (
            "Bez nalaza"
          ) : (
            `${result.totalFindings} nalaz(a)${truncated ? ` — prikazano prvih ${result.findings.length}` : ""}`
          )}
          {result.scanned != null && (
            <span className="text-slate-600"> · skenirano {result.scanned}</span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 sm:flex-shrink-0">
          {result.ms} ms
        </span>
      </div>

      {result.findings.length > 0 && (
        <details className="mt-2">
          <summary className="text-[11px] text-slate-400 cursor-pointer select-none hover:text-white transition">
            Prikaži nalaze
          </summary>
          <div className="mt-1 rounded-lg bg-slate-800/60 border border-slate-700 px-3">
            {result.findings.map((f, i) => (
              <FindingRow key={`${f.subject.id}-${i}`} finding={f} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function IntegritySection() {
  const {
    tenants,
    loadingTenants,
    tenantsError,
    tenantId,
    selectTenant,
    run,
    running,
    report,
  } = useSuperAdminIntegrity();

  const summaryChips = report
    ? ([
        [report.summary.errors, "grešaka", SEVERITY_STYLE.error.cls],
        [report.summary.warnings, "upozorenja", SEVERITY_STYLE.warning.cls],
        [report.summary.infos, "info", SEVERITY_STYLE.info.cls],
        [report.summary.failedChecks, "neizvršenih", FAILED_STYLE.cls],
      ] as const)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-white">
          Client Identity / Loyalty Integrity
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Server-side provere integriteta podataka po salonu (read-only):
          merge reference, loyalty nalozi/ledger/balansi, vaučeri, termini.
          Preporuke za popravku su samo tekst — ništa se ne menja automatski.
        </p>
      </div>

      <div className={card}>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className={inp}
            value={tenantId}
            onChange={(e) => selectTenant(e.target.value)}
            disabled={loadingTenants || running}
          >
            <option value="">— Izaberite salon —</option>
            {tenants.map((t) => (
              <option key={t.tenantId} value={t.tenantId}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={!tenantId || running}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-violet-600 text-white hover:bg-violet-500 sm:flex-shrink-0"
          >
            {running ? (
              <ArrowPathIcon className="size-4 animate-spin" />
            ) : (
              <PlayIcon className="size-4" />
            )}
            {running ? "Provere u toku…" : "Pokreni provere"}
          </button>
        </div>
        {tenantsError && (
          <p className="text-xs text-red-300 mt-2">
            Učitavanje liste salona nije uspelo.
          </p>
        )}
      </div>

      {report && summaryChips && (
        <div className={card}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {summaryChips.map(([count, label, cls]) => (
              <span
                key={label}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${count > 0 ? cls : "bg-slate-800 text-slate-500 border-slate-700"}`}
              >
                {count} {label}
              </span>
            ))}
            <span className="text-[10px] text-slate-500 ml-auto">
              {new Date(report.ranAt).toLocaleString("sr-RS")}
            </span>
          </div>
          <div className="px-1">
            {report.results.map((r) => (
              <CheckRow key={r.key} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
