import React, { useState } from "react";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { StatsCards } from "@/components/admin/statistics/StatsCards";
import { StatsPieChart } from "@/components/admin/statistics/StatsPieChart";
import { StatsTable } from "@/components/admin/statistics/StatsTable";
import { useStatistics } from "@/hooks/useStatistics";

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

  const { clients, totalAppointments, totalRevenue } = useStatistics({
    month: selectedMonth,
    year: selectedYear,
  });

  const months = [
    { value: 1, label: "Januar" },
    { value: 2, label: "Februar" },
    { value: 3, label: "Mart" },
    { value: 4, label: "April" },
    { value: 5, label: "Maj" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Avgust" },
    { value: 9, label: "Septembar" },
    { value: 10, label: "Oktobar" },
    { value: 11, label: "Novembar" },
    { value: 12, label: "Decembar" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sr-RS", {
      style: "currency",
      currency: "RSD",
    }).format(amount);
  };
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

      {/* Filter controls */}
      <div className={`${card}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="month"
              className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
            >
              Mesec
            </label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-blue-500"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="year"
              className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
            >
              Godina
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cards */}
      <StatsCards month={selectedMonth} year={selectedYear} />

      {/* Full stats — starter+ */}
      {statsLevel === "none" && (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 dark:bg-gray-900 p-8 text-center text-sm text-zinc-400">
          Statistika nije dostupna na vašem planu.
        </div>
      )}

      {/* Charts and Tables — starter+ */}
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
              <div className="flex flex-col lg:flex-row justify-between items-center p-3 bg-green-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-green-700">
                  Ukupan prihod
                </span>
                <span className="text-lg font-bold text-green-900">
                  {global ? formatCurrency(totalRevenue) : formatCurrency(0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-purple-700">
                  Aktivni klijenti
                </span>
                <span className="text-lg font-bold text-purple-900">
                  {clients?.active || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-gray-950 rounded-lg">
                <span className="text-sm font-medium text-orange-700">
                  Novi klijenti
                </span>
                <span className="text-lg font-bold text-orange-900">
                  {clients?.new || 0}
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
                AI analiza i predviđanje termina dostupno je u Pro/Enterprise
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
