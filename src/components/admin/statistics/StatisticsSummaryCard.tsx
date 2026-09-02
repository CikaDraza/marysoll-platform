import { memo, type ReactNode } from "react";
import { StatisticsMetricCard } from "./StatisticsMetricCard";

interface StatisticsSummaryCardProps {
  accent: string;
  title: string;
  value: ReactNode;
  description?: ReactNode;
  subtitle?: ReactNode;
  iconBackground: string;
  iconColor: string;
  iconPath: string;
}

export const StatisticsSummaryCard = memo(function StatisticsSummaryCard({
  accent,
  title,
  value,
  description,
  subtitle,
  iconBackground,
  iconColor,
  iconPath,
}: StatisticsSummaryCardProps) {
  return (
    <StatisticsMetricCard accent={accent}>
      <div className="flex justify-between items-start">
        <div className="pr-2">
          <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">{title}</p>
          {subtitle}
          <div className="text-2xl font-bold text-gray-900 dark:text-zinc-300">{value}</div>
        </div>
        <div className={`${iconBackground} p-2 rounded-lg`}>
          <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
          </svg>
        </div>
      </div>
      {description && <div className="text-xs text-gray-500 dark:text-zinc-300 mt-2">{description}</div>}
    </StatisticsMetricCard>
  );
});
