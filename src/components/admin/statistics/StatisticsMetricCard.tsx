import type { ReactNode } from "react";

export function StatisticsMetricCard({
  children,
  accent = "border-violet-500",
}: {
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 border-l-4 ${accent}`}>
      {children}
    </div>
  );
}
