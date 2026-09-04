import { StatisticsMetricCard } from "@/components/admin/statistics/StatisticsMetricCard";
import { StatisticsPeriodFilter } from "@/components/admin/statistics/StatisticsPeriodFilter";
import type { ClientOverviewInsights } from "@/types/client-overview";
import { ClientOverviewSection } from "./ClientOverviewSection";
import { formatClientMoney } from "./formatters";

function valueOrZero(value: number | undefined) { return value ?? 0; }
function dateOrDash(value: string | undefined) { return value ?? "—"; }

function InsightCards({ insights }: { insights: ClientOverviewInsights }) {
  const metrics = [
    ["Potencijal", formatClientMoney(insights.potential)],
    ["Realizovano", formatClientMoney(insights.realized)],
    ["Ukupno termina", valueOrZero(insights.total)],
    ["Završeni", valueOrZero(insights.completed)],
    ["Otkazani", valueOrZero(insights.cancelled)],
    ["Nije došla/o", valueOrZero(insights.noShow)],
    ["Preporuke", valueOrZero(insights.testimonialCount)],
    ["Poslednja poseta", dateOrDash(insights.lastVisit?.date)],
    ["Sledeći termin", dateOrDash(insights.nextAppointment?.date)],
  ] as const;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value]) => <StatisticsMetricCard key={label} accent="border-violet-500"><p className="text-sm font-medium text-gray-600 dark:text-zinc-300">{label}</p><p className="mt-3 text-xl font-semibold text-gray-900 dark:text-zinc-100">{value}</p></StatisticsMetricCard>)}</div>;
}

function InsightsWarnings({ insights }: { insights: ClientOverviewInsights }) {
  return <>{valueOrZero(insights.withoutPrice) > 0 && <p className="text-xs text-amber-600">{insights.withoutPrice} termina nema definisanu cenu i ne ulazi u novčane zbirove.</p>}</>;
}

/**
 * Klijent čiji se dosije gleda je uvek na listi i vizuelno izdvojen — bez toga
 * tabela odgovara na pitanje koje niko nije postavio.
 */
function TopClientsTable({ insights }: { insights: ClientOverviewInsights }) {
  if (!insights.topClients?.length) return null;
  return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700"><thead><tr className="text-left text-xs uppercase tracking-wider text-gray-500"><th className="px-4 py-3 w-12">#</th><th className="px-4 py-3">Top 3 klijenta</th><th className="px-4 py-3 text-right">Termini</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{insights.topClients.map((entry) => <tr key={entry.clientId ?? entry.email} className={entry.isViewer ? "bg-violet-50 dark:bg-violet-950/40" : undefined}><td className={`px-4 py-3 tabular-nums ${entry.isViewer ? "font-bold text-violet-700 dark:text-violet-300" : "text-gray-400"}`}>{entry.rank}.</td><td className={`px-4 py-3 ${entry.isViewer ? "font-bold text-violet-700 dark:text-violet-300" : ""}`}>{entry.name}</td><td className={`px-4 py-3 text-right font-bold ${entry.isViewer ? "text-violet-700 dark:text-violet-300" : ""}`}>{entry.count}</td></tr>)}</tbody></table></div>;
}

function InsightContent({ insights }: { insights: ClientOverviewInsights }) {
  return <><InsightCards insights={insights} /><InsightsWarnings insights={insights} /></>;
}

function PeriodComparison({ insights, month, year, isFetching, onMonthChange, onYearChange }: {
  insights: ClientOverviewInsights;
  month: number;
  year: number;
  isFetching: boolean;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}) {
  return <div className="space-y-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800"><h4 className="font-bold text-gray-900 dark:text-gray-100">Top 3 poređenje po periodu</h4><StatisticsPeriodFilter month={month} year={year} onMonthChange={onMonthChange} onYearChange={onYearChange} idPrefix="client-insights" />{isFetching && <p role="status" className="text-xs font-medium text-violet-600">Osvežavanje poređenja…</p>}{insights.topThree && <p className="text-sm font-bold text-emerald-600">Klijent je u Top 3 za izabrani period.</p>}<TopClientsTable insights={insights} /></div>;
}

export function ClientInsightsSection({ insights, month, year, isFetching, onMonthChange, onYearChange }: {
  insights: ClientOverviewInsights;
  month: number;
  year: number;
  isFetching: boolean;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}) {
  return <ClientOverviewSection title="Statistika i CRM uvidi" open><div className="space-y-4"><InsightContent insights={insights} /><PeriodComparison insights={insights} month={month} year={year} isFetching={isFetching} onMonthChange={onMonthChange} onYearChange={onYearChange} /></div></ClientOverviewSection>;
}
