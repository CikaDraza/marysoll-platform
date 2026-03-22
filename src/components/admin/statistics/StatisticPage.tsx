import React, { useState } from "react";
import { StatsCards } from "@/components/admin/statistics/StatsCards";
import { StatsPieChart } from "@/components/admin/statistics/StatsPieChart";
import { StatsTable } from "@/components/admin/statistics/StatsTable";
import { useStatistics } from "@/hooks/useStatistics";

export const StatisticsPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl! font-bold text-gray-900 mb-2">
          Pregled performansi salona po mesecima
        </h1>
        <p className="text-gray-600"></p>
      </div>

      {/* Filter controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="month"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Mesec
            </label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Godina
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StatsPieChart month={selectedMonth} year={selectedYear} />
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Brzi pregled
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">
                Ukupno termina
              </span>
              <span className="text-lg font-bold text-blue-900">
                {totalAppointments || 0}
              </span>
            </div>
            <div className="flex flex-col lg:flex-row justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">
                Ukupan prihod
              </span>
              <span className="text-lg font-bold text-green-900">
                {global ? formatCurrency(totalRevenue) : formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-purple-700">
                Aktivni klijenti
              </span>
              <span className="text-lg font-bold text-purple-900">
                {clients?.active || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
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

      {/* Detailed Table */}
      <StatsTable month={selectedMonth} year={selectedYear} />
    </div>
  );
};

export default StatisticsPage;
