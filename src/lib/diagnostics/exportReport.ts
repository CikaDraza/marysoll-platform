/**
 * Bočni sloj izvoza dijagnostike (browser API): Blob download + print-to-PDF
 * prozor. Čist sadržaj gradi helpers/diagnosticsReport.ts; ovde su samo efekti.
 * Bez spoljnih zavisnosti (CSP-friendly).
 */
import type { DiagReportDTO } from "@/types/diagnostics";
import {
  diagFilename,
  reportsToMarkdown,
  reportsToPdfHtml,
  reportsToText,
} from "@/helpers/diagnosticsReport";

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
    `dijagnostika-${diagFilename(label)}.txt`,
    reportsToText(label, reports),
    "text/plain",
  );
}

export function exportMarkdown(label: string, reports: DiagReportDTO[]): void {
  downloadFile(
    `dijagnostika-${diagFilename(label)}.md`,
    reportsToMarkdown(label, reports),
    "text/markdown",
  );
}

export function exportPdf(label: string, reports: DiagReportDTO[]): void {
  const html = reportsToPdfHtml(label, reports);
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
