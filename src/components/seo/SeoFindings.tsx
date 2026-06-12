"use client";

import type {
  SeoConfidence,
  SeoFinding,
  SeoSeverity,
  TechnicalAuditReport,
} from "@/types/seo-report";

const CONFIDENCE_GROUPS: {
  key: SeoConfidence;
  label: string;
  hint: string;
}[] = [
  {
    key: "high",
    label: "Pravi SEO problemi",
    hint: "Deterministički izmereno — visoka pouzdanost",
  },
  {
    key: "medium",
    label: "Conversion i sadržaj",
    hint: "Predlozi za konverziju, copy i funnel",
  },
  {
    key: "low",
    label: "Low confidence",
    hint: "Proveriti ručno",
  },
];

const SEVERITY_ICON: Record<SeoSeverity, string> = {
  critical: "⛔",
  warning: "⚠️",
  info: "ℹ️",
};

const CATEGORY_LABEL: Record<string, string> = {
  technical: "Tehnika",
  metadata: "Metadata",
  content: "Sadržaj",
  cta: "CTA",
  conversion: "Konverzija",
  funnel: "Funnel",
};

type Variant = "superadmin" | "tenant";

interface Palette {
  groupHeading: string;
  hint: string;
  card: string;
  title: string;
  detail: string;
  suggestion: string;
  chip: string;
  signalChip: string;
}

function palette(variant: Variant): Palette {
  if (variant === "superadmin") {
    return {
      groupHeading: "text-slate-200",
      hint: "text-slate-500",
      card: "bg-slate-700/40 border border-slate-700",
      title: "text-slate-100",
      detail: "text-slate-400",
      suggestion: "text-violet-300",
      chip: "bg-slate-700 text-slate-300",
      signalChip: "bg-slate-700/60 text-slate-300",
    };
  }
  return {
    groupHeading: "text-gray-800 dark:text-gray-100",
    hint: "text-gray-400 dark:text-gray-500",
    card: "bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700",
    title: "text-gray-900 dark:text-gray-100",
    detail: "text-gray-500 dark:text-gray-400",
    suggestion: "text-violet-600 dark:text-violet-300",
    chip: "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300",
    signalChip: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
  };
}

function severityTitleColor(severity: SeoSeverity): string {
  if (severity === "critical") return "text-red-500";
  if (severity === "warning") return "text-amber-500";
  return "";
}

function TechnicalSummary({
  technical,
  p,
}: {
  technical: TechnicalAuditReport;
  p: Palette;
}) {
  const s = technical.signals;
  const imgByType = Object.entries(s.imagesByType)
    .map(([type, count]) => `${type}:${count}`)
    .join(", ");
  const chips = [
    `H1: ${s.h1Count}`,
    `naslovi: ${s.headingCount}`,
    `title: ${s.hasTitle ? s.titleLength : "—"}`,
    `desc: ${s.hasDescription ? s.descriptionLength : "—"}`,
    `canonical: ${s.hasCanonical ? "da" : "ne"}`,
    `noindex: ${s.isNoindex ? "DA" : "ne"}`,
    `schema: ${s.hasSchema ? "da" : "ne"}`,
    `slike: ${s.imageCount}${imgByType ? ` (${imgByType})` : ""}`,
    `bez alt: ${s.imagesMissingAlt}`,
    `sitemap: ${s.hasSitemap ? "da" : "ne"}`,
    `robots.txt: ${s.hasRobotsTxt ? "da" : "ne"}`,
  ];
  return (
    <div>
      <p className={`text-xs font-bold uppercase mb-2 ${p.groupHeading}`}>
        Tehnički signali
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.signalChip}`}
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders SEO findings grouped by confidence tier, plus a deterministic
 * technical-signals summary. Shared by superadmin Marketing and tenant Landing CMS.
 */
export function SeoFindings({
  findings,
  technical,
  variant = "tenant",
}: {
  findings?: SeoFinding[];
  technical?: TechnicalAuditReport;
  variant?: Variant;
}) {
  if (!findings?.length) return null;
  const p = palette(variant);

  return (
    <div className="space-y-4">
      {CONFIDENCE_GROUPS.map((group) => {
        const items = findings.filter((f) => f.confidence === group.key);
        if (!items.length) return null;
        return (
          <div key={group.key}>
            <p className={`text-sm font-bold ${p.groupHeading}`}>
              {group.label}{" "}
              <span className={`text-xs font-normal ${p.hint}`}>
                ({items.length}) · {group.hint}
              </span>
            </p>
            <ul className="mt-2 space-y-1.5">
              {items.map((f) => (
                <li
                  key={f.id}
                  className={`rounded-lg px-3 py-2 ${p.card}`}
                >
                  <p
                    className={`text-sm font-semibold flex items-start gap-2 ${p.title}`}
                  >
                    <span className="shrink-0">{SEVERITY_ICON[f.severity]}</span>
                    <span className={severityTitleColor(f.severity)}>
                      {f.title}
                    </span>
                    <span
                      className={`ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.chip}`}
                    >
                      {CATEGORY_LABEL[f.category] ?? f.category}
                    </span>
                  </p>
                  {f.detail && (
                    <p className={`mt-1 text-xs ${p.detail}`}>{f.detail}</p>
                  )}
                  {f.suggestion && (
                    <p className={`mt-1 text-xs ${p.suggestion}`}>
                      → {f.suggestion}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {technical && <TechnicalSummary technical={technical} p={p} />}
    </div>
  );
}
