import React from "react";
import { useStatistics } from "@/hooks/useStatistics";

interface StatsTableProps {
  month: number;
  year: number;
}

export const StatsTable: React.FC<StatsTableProps> = ({ month, year }) => {
  const {
    topClients,
    topServices,
    totalAppointments,
    services,
    isLoading,
    error,
  } = useStatistics({ month, year });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 dark:bg-gray-950 rounded w-full mb-2"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
        <div className="text-red-600 text-center py-4">
          Greška pri učitavanju podataka: {error.message}
        </div>
      </div>
    );
  }

  if (!global || !services) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
        <div className="text-gray-500 dark:text-gray-200 text-center py-4">
          Nema podataka za prikaz
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sr-RS", {
      style: "currency",
      currency: "RSD",
    }).format(amount);
  };

  const sortedServices = [...services].sort(
    (a: { count: number }, b: { count: number }) => b.count - a.count,
  );
  const card =
    "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6";

  return (
    <div className={`${card}`}>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-300 mb-4">
        Detaljna statistika - {month}/{year}
      </h3>

      {/* Top klijenti */}
      <div className={`${card}`}>
        <h4 className="text-md font-medium text-gray-700 dark:text-zinc-300 mb-3">
          Top 3 klijenta
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                  Broj termina
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:divide-zinc-700">
              {topClients && topClients.length > 0 ? (
                topClients.map(
                  (client: { email: string; count: number }, index: number) => (
                    <tr
                      key={client.email}
                      className={
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-gray-50 dark:bg-gray-800"
                      }
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {client.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {client.count}
                      </td>
                    </tr>
                  ),
                )
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-300"
                  >
                    Nema podataka o klijentima
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top usluge */}
      <div className={`${card}`}>
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
          Top usluge
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usluga
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Broj termina
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
              {topServices && topServices.length > 0 ? (
                topServices.map(
                  (
                    service: { service: string; count: number },
                    index: number,
                  ) => (
                    <tr
                      key={service.service}
                      className={
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-gray-50 dark:bg-gray-800"
                      }
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {service.service}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {service.count}
                      </td>
                    </tr>
                  ),
                )
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-center text-sm text-gray-500"
                  >
                    Nema podataka o uslugama
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detaljna raspodela usluga */}
      <div className={`${card}`}>
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
          Detaljna raspodela usluga
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usluga
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Broj termina
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prihod
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Udeo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
              {sortedServices.map((service, index) => (
                <tr
                  key={service.name}
                  className={
                    index % 2 === 0
                      ? "bg-white dark:bg-gray-900"
                      : "bg-gray-50 dark:bg-gray-800"
                  }
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {service.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {service.count}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {formatCurrency(service.revenue)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {totalAppointments > 0
                      ? `${((service.count / totalAppointments) * 100).toFixed(
                          1,
                        )}%`
                      : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
