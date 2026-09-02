import { useStatistics } from "@/hooks/useStatistics";
import { formatStatisticsCurrency } from "./statisticsFormatters";
import { StatisticsSummaryCard } from "./StatisticsSummaryCard";

interface StatsCardsProps { month: number; year: number }

const MONTHS_LOCATIVE = ["januaru", "februaru", "martu", "aprilu", "maju", "junu", "julu", "avgustu", "septembru", "oktobru", "novembru", "decembru"];

export function StatsCards({ month, year }: StatsCardsProps) {
  const { totalRevenue, totalAppointments, avgTimeGap, clients, isLoading, error } = useStatistics({ month, year });

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{Array.from({ length: 4 }, (_, index) => <div key={index} className="bg-gray-200 dark:bg-gray-900 rounded-lg p-4 animate-pulse h-24" />)}</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">Greška pri učitavanju statistike: {error.message}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatisticsSummaryCard accent="border-green-500" title="Ukupan potencijalni prihod" subtitle={<p className="text-xs text-gray-700 dark:text-zinc-300">Za zakazane termine {month}/{year}</p>} value={formatStatisticsCurrency(totalRevenue)} iconBackground="bg-green-100" iconColor="text-green-600" iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      <StatisticsSummaryCard accent="border-blue-500" title="Ukupno termina" value={totalAppointments} description="Zakazani termini" iconBackground="bg-blue-100" iconColor="text-blue-600" iconPath="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <StatisticsSummaryCard accent="border-purple-500" title={`Zakazali u ${MONTHS_LOCATIVE[month - 1]}`} value={clients.active} subtitle={<p className="text-xs mt-1"><span className="text-green-600 font-semibold">{clients.new} {clients.new === 1 ? "nov" : "novih"}</span><span className="text-gray-400"> · </span><span className="text-gray-500 dark:text-zinc-400">{clients.returning} {clients.returning === 1 ? "povratni" : "povratnih"}</span></p>} description={<>Ukupno registrovanih {clients.total}{clients.registeredThisMonth > 0 && <span className="text-green-600"> · +{clients.registeredThisMonth} {clients.registeredThisMonth === 1 ? "nov nalog" : "novih naloga"}</span>}</>} iconBackground="bg-purple-100" iconColor="text-purple-600" iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      <StatisticsSummaryCard accent="border-orange-500" title="Prosečan razmak" value={`${avgTimeGap} min`} description="Između termina" iconBackground="bg-orange-100" iconColor="text-orange-600" iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </div>
  );
}
