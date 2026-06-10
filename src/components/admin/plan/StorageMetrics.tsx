"use client";

import { CloudArrowUpIcon, CircleStackIcon } from "@heroicons/react/24/outline";

interface StorageMetricsProps {
  storageMetrics: {
    mongoUsageMb: number;
    cloudinaryUsageMb: number;
    updatedAt: string;
  };
  dbStorageGb: number;
}

function formatMb(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  // Sitne vrednosti (ispod 1 MB) prikaži u KB da se vidi da potrošnja postoji.
  if (mb > 0 && mb < 1) {
    return `${Math.round(mb * 1024)} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

function formatLimit(dbStorageGb: number): string {
  if (dbStorageGb === -1) return "Neograničeno";
  return `${dbStorageGb} GB`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sr-RS", { dateStyle: "long" }).format(
    new Date(iso),
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
  limitLabel: string;
  updatedAt: string;
}

function MetricCard({
  icon,
  title,
  subtitle,
  value,
  limitLabel,
  updatedAt,
}: MetricCardProps) {
  return (
    <div className="admin-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {value}
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          Limit plana: {limitLabel}
        </p>
      </div>

      <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-600">
        Poslednje ažurirano: {formatDate(updatedAt)}
      </p>
    </div>
  );
}

export function StorageMetrics({
  storageMetrics,
  dbStorageGb,
}: StorageMetricsProps) {
  const limitLabel = formatLimit(dbStorageGb);

  return (
    <div className="space-y-4">
      <MetricCard
        icon={
          <CloudArrowUpIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        }
        title="Prostor za medije"
        subtitle="Cloudinary / slike i fajlovi"
        value={formatMb(storageMetrics.cloudinaryUsageMb)}
        limitLabel={limitLabel}
        updatedAt={storageMetrics.updatedAt}
      />
      <MetricCard
        icon={
          <CircleStackIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        }
        title="Prostor za podatke"
        subtitle="MongoDB / baza podataka"
        value={formatMb(storageMetrics.mongoUsageMb)}
        limitLabel={limitLabel}
        updatedAt={storageMetrics.updatedAt}
      />
    </div>
  );
}
