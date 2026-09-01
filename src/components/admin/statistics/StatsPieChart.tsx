import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useStatistics } from "@/hooks/useStatistics";
import Loader from "@/components/elements/Loader";

// Eksplicitni recharts tipovi
type PieData = {
  name: string;
  value: number;
  [key: string]: unknown; // Index signature za dodatne propertije
};

interface StatsPieChartProps {
  month: number;
  year: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PieData & {
      revenue: number;
      fullName: string;
    };
  }>;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{data.fullName}</p>
        <p className="text-sm text-gray-600">Broj termina: {data.value}</p>
        <p className="text-sm text-gray-600">
          Prihod:{" "}
          {new Intl.NumberFormat("sr-RS", {
            style: "currency",
            currency: "RSD",
          }).format(data.revenue)}
        </p>
      </div>
    );
  }
  return null;
};

export const StatsPieChart: React.FC<StatsPieChartProps> = ({
  month,
  year,
}) => {
  const { services, isLoading, error } = useStatistics({ month, year });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 h-80 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 h-80 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">
          Greška pri učitavanju podataka
        </div>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 h-80 flex items-center justify-center">
        <div className="text-gray-500">Nema podataka o uslugama za prikaz</div>
      </div>
    );
  }

  // Priprema podataka sa index signature-om
  const chartData: PieData[] = [...services]
    .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
    .slice(0, 5)
    .map((service: { name: string; count: number; revenue: number | null }) => ({
      name:
        service.name.length > 20
          ? `${service.name.substring(0, 20)}...`
          : service.name,
      value: service.count,
      // Grafikon crta UDEO PO BROJU termina; nepoznata cena ne menja krišku,
      // pa se za prikaz iznosa uzima 0 umesto da se usluga izgubi.
      revenue: service.revenue ?? 0,
      fullName: service.name,
    }));

  const totalCount = services.reduce(
    (sum: number, service: { count: number }) => sum + service.count,
    0,
  );
  const shownCount = chartData.reduce(
    (sum: number, item: PieData) => sum + item.value,
    0,
  );

  if (shownCount < totalCount) {
    chartData.push({
      name: "Ostalo",
      value: totalCount - shownCount,
      revenue: services
        .slice(5)
        .reduce(
          (sum: number, service: { revenue: number | null }) =>
      sum + (service.revenue ?? 0),
          0,
        ),
      fullName: "Ostale usluge",
    } as PieData);
  }

  const renderLabel = ({ percent }: { percent?: number }) => {
    const percentage = percent ? (percent * 100).toFixed(0) : "0";
    return `(${percentage}%)`;
  };
  const card =
    "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6";

  return (
    <div className={`${card}`}>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-4">
        Distribucija usluga - {month}/{year}
      </h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
