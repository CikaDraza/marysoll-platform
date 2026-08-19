import React from "react";
import { useStatistics } from "@/hooks/useStatistics";

interface StatsCardsProps {
  month: number;
  year: number;
}

/** Lokativ meseca za naslov kartice ("Zakazali u avgustu"). */
const MONTHS_LOCATIVE = [
  "januaru",
  "februaru",
  "martu",
  "aprilu",
  "maju",
  "junu",
  "julu",
  "avgustu",
  "septembru",
  "oktobru",
  "novembru",
  "decembru",
];

export const StatsCards: React.FC<StatsCardsProps> = ({ month, year }) => {
  const {
    totalRevenue,
    totalAppointments,
    avgTimeGap,
    clients,
    isLoading,
    error,
  } = useStatistics({ month, year });

  const global = { totalRevenue, totalAppointments, avgTimeGap, clients };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-900 rounded-lg p-4 animate-pulse h-24"
          ></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
        Greška pri učitavanju statistike: {error.message}
      </div>
    );
  }

  if (!global) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 mb-6">
        Nema podataka za prikaz
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sr-RS", {
      style: "currency",
      currency: "RSD",
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Ukupan potencijalni prihod — svi zakazani termini, bez obzira na ishod */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 border-l-4 border-green-500">
        <div className="flex justify-between items-start">
          <div className="pr-2">
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">
              Ukupan potencijalni prihod
            </p>
            <p className="text-xs text-gray-700 dark:text-zinc-300">
              Za zakazane termine {month}/{year}
            </p>
          </div>
          <div className="bg-green-100 p-1 rounded-lg">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
        </div>
        <p className="text-xl font-semibold mt-3">
          {formatCurrency(totalRevenue)}
        </p>
      </div>

      {/* Ukupno termina */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 border-l-4 border-blue-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">
              Ukupno termina
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-zinc-300">
              {totalAppointments || 0}
            </p>
          </div>
          <div className="bg-blue-100 p-2 rounded-lg">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-300 mt-2">
          Zakazani termini
        </p>
      </div>

      {/* Klijenti koji su zakazali u mesecu — sa podelom novi / povratni */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 border-l-4 border-purple-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">
              Zakazali u {MONTHS_LOCATIVE[month - 1]}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-zinc-300">
              {clients.active}
            </p>
            <p className="text-xs mt-1">
              <span className="text-green-600 font-semibold">
                {clients.new} {clients.new === 1 ? "nov" : "novih"}
              </span>
              <span className="text-gray-400"> · </span>
              <span className="text-gray-500 dark:text-zinc-400">
                {clients.returning}{" "}
                {clients.returning === 1 ? "povratni" : "povratnih"}
              </span>
            </p>
          </div>
          <div className="bg-purple-100 p-2 rounded-lg">
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-300 mt-2">
          Ukupno registrovanih {clients.total}
          {clients.registeredThisMonth > 0 && (
            <span className="text-green-600">
              {" "}
              · +{clients.registeredThisMonth}{" "}
              {clients.registeredThisMonth === 1
                ? "nov nalog"
                : "novih naloga"}
            </span>
          )}
        </p>
      </div>

      {/* Prosečan razmak */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 border-l-4 border-orange-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">
              Prosečan razmak
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-zinc-300">
              {avgTimeGap} min
            </p>
          </div>
          <div className="bg-orange-100 p-2 rounded-lg">
            <svg
              className="w-6 h-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-300 mt-2">
          Između termina
        </p>
      </div>
    </div>
  );
};
