/**
 * Klijentski export dijagnostičkih izveštaja: .txt, .md i PDF (preko štampe).
 * Bez spoljnih zavisnosti (CSP-friendly) — Blob download + print-to-PDF prozor.
 */
import type { DiagModuleResult, DiagReportDTO } from "@/types/diagnostics";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sr-RS");
  } catch {
    return iso;
  }
}

function stateMark(state: DiagModuleResult["state"]): string {
  switch (state) {
    case "ok":
      return "OK";
    case "fail":
      return "GREŠKA";
    case "warn":
      return "UPOZORENJE";
    case "info":
      return "INFO";
    default:
      return String(state).toUpperCase();
  }
}

function safeFilename(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "izvestaj"
  );
}

// ─── Plain text ─────────────────────────────────────────────────────────────
export function reportsToText(label: string, reports: DiagReportDTO[]): string {
  const lines: string[] = [];
  lines.push(`MARYSOLL DIJAGNOSTIKA — ${label}`);
  lines.push(`Izveštaja: ${reports.length}`);
  lines.push(`Generisano: ${fmtDate(new Date().toISOString())}`);
  lines.push("=".repeat(60));

  reports.forEach((r, i) => {
    lines.push("");
    lines.push(`[${i + 1}] ${fmtDate(r.createdAt)}`);
    lines.push(`  Host: ${r.pageHost ?? "—"}`);
    lines.push(`  IP: ${r.ip ?? "—"}   Zemlja: ${r.country ?? "—"}`);
    lines.push(`  Uređaj: ${r.userAgent ?? "—"}`);
    if (r.results && r.results.length > 0) {
      lines.push(`  Moduli:`);
      for (const m of r.results) {
        const ms = m.ms != null ? ` (${m.ms} ms)` : "";
        lines.push(`    - [${stateMark(m.state)}] ${m.name}${ms}`);
        if (m.detail) lines.push(`        ${m.detail}`);
        if (m.data && Object.keys(m.data).length > 0) {
          lines.push(`        ${JSON.stringify(m.data)}`);
        }
      }
    } else {
      lines.push(`  (bez modula)`);
    }
    lines.push("-".repeat(60));
  });

  return lines.join("\n");
}

// ─── Markdown ───────────────────────────────────────────────────────────────
export function reportsToMarkdown(
  label: string,
  reports: DiagReportDTO[],
): string {
  const md: string[] = [];
  md.push(`# Marysoll dijagnostika — ${label}`);
  md.push("");
  md.push(`- **Izveštaja:** ${reports.length}`);
  md.push(`- **Generisano:** ${fmtDate(new Date().toISOString())}`);
  md.push("");

  reports.forEach((r, i) => {
    md.push(`## ${i + 1}. ${fmtDate(r.createdAt)}`);
    md.push("");
    md.push(`| Polje | Vrednost |`);
    md.push(`|---|---|`);
    md.push(`| Host | ${r.pageHost ?? "—"} |`);
    md.push(`| IP | ${r.ip ?? "—"} |`);
    md.push(`| Zemlja | ${r.country ?? "—"} |`);
    md.push(`| Uređaj | ${(r.userAgent ?? "—").replace(/\|/g, "\\|")} |`);
    md.push("");
    if (r.results && r.results.length > 0) {
      md.push(`| Modul | Status | Vreme | Detalji |`);
      md.push(`|---|---|---|---|`);
      for (const m of r.results) {
        const detail = (m.detail ?? "").replace(/\|/g, "\\|");
        const data =
          m.data && Object.keys(m.data).length > 0
            ? " · " + JSON.stringify(m.data).replace(/\|/g, "\\|")
            : "";
        md.push(
          `| ${m.name} | ${stateMark(m.state)} | ${m.ms != null ? `${m.ms} ms` : "—"} | ${detail}${data} |`,
        );
      }
    } else {
      md.push(`_Bez modula._`);
    }
    md.push("");
  });

  return md.join("\n");
}

// ─── Download helper ─────────────────────────────────────────────────────────
export function downloadFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Oslobodi URL posle klika (nizak timeout je dovoljan da download krene).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportText(label: string, reports: DiagReportDTO[]): void {
  downloadFile(
    `dijagnostika-${safeFilename(label)}.txt`,
    reportsToText(label, reports),
    "text/plain",
  );
}

export function exportMarkdown(label: string, reports: DiagReportDTO[]): void {
  downloadFile(
    `dijagnostika-${safeFilename(label)}.md`,
    reportsToMarkdown(label, reports),
    "text/markdown",
  );
}

// ─── PDF (preko print prozora — bez zavisnosti) ──────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportPdf(label: string, reports: DiagReportDTO[]): void {
  const rows = reports
    .map((r, i) => {
      const modules =
        r.results && r.results.length > 0
          ? r.results
              .map(
                (m) => `
              <tr>
                <td>${escapeHtml(m.name)}</td>
                <td class="s-${m.state}">${stateMark(m.state)}</td>
                <td>${m.ms != null ? `${m.ms} ms` : "—"}</td>
                <td>${escapeHtml(m.detail ?? "")}${
                  m.data && Object.keys(m.data).length > 0
                    ? `<br><span class="data">${escapeHtml(JSON.stringify(m.data))}</span>`
                    : ""
                }</td>
              </tr>`,
              )
              .join("")
          : `<tr><td colspan="4"><em>Bez modula.</em></td></tr>`;
      return `
        <section>
          <h2>${i + 1}. ${escapeHtml(fmtDate(r.createdAt))}</h2>
          <p class="meta">
            <strong>Host:</strong> ${escapeHtml(r.pageHost ?? "—")} ·
            <strong>IP:</strong> ${escapeHtml(r.ip ?? "—")} ·
            <strong>Zemlja:</strong> ${escapeHtml(r.country ?? "—")}<br>
            <strong>Uređaj:</strong> ${escapeHtml(r.userAgent ?? "—")}
          </p>
          <table>
            <thead><tr><th>Modul</th><th>Status</th><th>Vreme</th><th>Detalji</th></tr></thead>
            <tbody>${modules}</tbody>
          </table>
        </section>`;
    })
    .join("");

  const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8">
    <title>Dijagnostika — ${escapeHtml(label)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111; margin: 24px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .sub { color: #666; font-size: 12px; margin: 0 0 20px; }
      section { margin-bottom: 22px; page-break-inside: avoid; }
      h2 { font-size: 14px; margin: 0 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      .meta { font-size: 11px; color: #333; margin: 0 0 8px; word-break: break-word; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; vertical-align: top; }
      th { background: #f4f4f5; }
      .data { color: #666; font-family: ui-monospace, monospace; font-size: 10px; }
      .s-ok { color: #059669; font-weight: 700; }
      .s-fail { color: #dc2626; font-weight: 700; }
      .s-warn { color: #d97706; font-weight: 700; }
      .s-info { color: #0284c7; font-weight: 700; }
    </style></head><body>
    <h1>Marysoll dijagnostika — ${escapeHtml(label)}</h1>
    <p class="sub">Izveštaja: ${reports.length} · Generisano: ${escapeHtml(fmtDate(new Date().toISOString()))}</p>
    ${rows}
    <script>window.onload = function(){ window.print(); }</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    // Popup blokiran — fallback na .txt da korisnik ne ostane bez izlaza.
    exportText(label, reports);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
