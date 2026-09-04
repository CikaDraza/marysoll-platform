import React, { useState } from "react";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { StatsCards } from "@/components/admin/statistics/StatsCards";
import { StatsPieChart } from "@/components/admin/statistics/StatsPieChart";
import { StatsTable } from "@/components/admin/statistics/StatsTable";
import { useStatistics } from "@/hooks/useStatistics";
import { StatisticsPeriodFilter } from "./StatisticsPeriodFilter";
import { formatStatisticsCurrency } from "./statisticsFormatters";

export const StatisticsPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { features } = usePlanFeatures();
  // Ako override ima statistics:true ali ne i statisticsLevel, odredi nivo po AI feature-ima
  const statsLevel = (() => {
    if (!features.statistics) return "none";
    if (features.statisticsLevel !== "none") return features.statisticsLevel;
    return features.aiMarketingAnalysis ? "ai" : "full";
  })();

  const { clients, totalAppointments, revenue } = useStatistics({
    month: selectedMonth,
    year: selectedYear,
  });

  const card =
    "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl! font-bold text-gray-900 dark:text-zinc-100 mb-2">
          Pregled performansi salona po mesecima
        </h1>
        <p className="text-gray-600"></p>
      </div>

      <div className="mb-6">
        <StatisticsPeriodFilter month={selectedMonth} year={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
      </div>

      {/* Cards */}
      <StatsCards month={selectedMonth} year={selectedYear} />

      {/* Full stats — claudia+ */}
      {statsLevel === "none" && (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 dark:bg-gray-900 p-8 text-center text-sm text-zinc-400">
          Statistika nije dostupna na vašem planu.
        </div>
      )}

      {/* Charts and Tables — claudia+ */}
      {(statsLevel === "full" || statsLevel === "ai") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StatsPieChart month={selectedMonth} year={selectedYear} />
          <div className={`${card}`}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-4">
              Brzi pregled
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  Ukupno termina
                </span>
                <span className="text-lg font-bold text-blue-900">
                  {totalAppointments || 0}
                </span>
              </div>
              {/* Prihod: potencijal (svi zakazani) → ostvaren (označeni kao
                  došli) → neostvaren (otkazani/odbijeni). */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 p-3 bg-sky-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-sky-700">
                  Ukupan potencijalni prihod
                </span>
                <span className="text-lg font-bold text-sky-900 dark:text-sky-300">
                  {formatStatisticsCurrency(revenue.potential)}
                </span>
              </div>
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 p-3 bg-green-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-green-700">
                  Ostvaren prihod
                  <span className="block text-[11px] font-normal text-green-600/70">
                    Termini označeni kao završeni ({revenue.completedCount})
                  </span>
                </span>
                <span className="text-lg font-bold text-green-900 dark:text-green-300">
                  {formatStatisticsCurrency(revenue.completed)}
                </span>
              </div>
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 p-3 bg-red-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-red-700">
                  Neostvaren prihod
                  <span className="block text-[11px] font-normal text-red-600/70">
                    Otkazani i odbijeni termini ({revenue.cancelledCount})
                  </span>
                </span>
                <span className="text-lg font-bold text-red-900 dark:text-red-300">
                  {formatStatisticsCurrency(revenue.cancelled)}
                </span>
              </div>
              {/* Termini bez cene — prikazuje se SAMO ako ih ima. Ne ulaze ni u
                  potencijalni ni u ostvaren prihod, pa bi bez ovog reda salon
                  video manje termina nego što ih zaista ima. */}
              {revenue.withoutPriceCount > 0 && (
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 p-3 bg-amber-50 dark:bg-gray-950 rounded-lg">
                  <span className="text-sm font-medium text-amber-700">
                    Termini bez cene
                    <span className="block text-[11px] font-normal text-amber-600/70">
                      Cena nije uneta — ne ulaze u prihod
                    </span>
                  </span>
                  <span className="text-lg font-bold text-amber-900 dark:text-amber-300">
                    {revenue.withoutPriceCount}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-purple-700">
                  Aktivni klijenti
                  <span className="block text-[11px] font-normal text-purple-600/70">
                    Zakazali u ovom mesecu — {clients?.new || 0} novih,{" "}
                    {clients?.returning || 0} povratnih
                  </span>
                </span>
                <span className="text-lg font-bold text-purple-900 dark:text-purple-300">
                  {clients?.active || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-orange-700">
                  Novi nalozi
                  <span className="block text-[11px] font-normal text-orange-600/70">
                    Registrovali se u ovom mesecu
                  </span>
                </span>
                <span className="text-lg font-bold text-orange-900 dark:text-orange-300">
                  {clients?.registeredThisMonth || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {statsLevel === "ai" && (
        <StatsTable month={selectedMonth} year={selectedYear} />
      )}
      {statsLevel === "ai" && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-6 mt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-sm font-bold text-violet-800 mb-1">
                AI Analiza statistike
              </p>
              <p className="text-xs text-violet-600">
                AI analiza i predviđanje termina dostupno je u Kiki/Enterprise
                planu. Dolazi u sledećoj verziji.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsPage;
