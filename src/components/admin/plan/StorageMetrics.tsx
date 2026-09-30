"use client";

import { CloudArrowUpIcon, CircleStackIcon } from "@heroicons/react/24/outline";
import { formatResourceMb } from "@/helpers/formatResourceMb";
import { PLAN_DISPLAY_NAMES } from "@/lib/plans/planFeatures";
import type {
  ResourceMetricUsage,
  ResourceQuotaStatus,
  TenantResourceUsage,
} from "@/types/resource-quota";

interface StorageMetricsProps {
  resourceUsage: TenantResourceUsage;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sr-RS", { dateStyle: "long" }).format(
    new Date(iso),
  );
}

const STATUS_LABELS: Record<ResourceQuotaStatus, string> = {
  healthy: "U okviru kapaciteta",
  warning: "Približavate se kapacitetu",
  limit_reached: "Kapacitet dostignut",
};

const STATUS_CLASSES: Record<ResourceQuotaStatus, string> = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  limit_reached: "text-red-600 dark:text-red-400",
};

function MetricCard({
  icon,
  title,
  subtitle,
  metric,
  planLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  metric: ResourceMetricUsage;
  planLabel: string;
}) {
  const displayPercent =
    metric.percent == null ? null : Math.min(metric.percent, 100);
  const quotaLabel =
    metric.quotaMb == null
      ? "Soft kvota nije određena"
      : formatResourceMb(metric.quotaMb);

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
          {formatResourceMb(metric.usedMb)} / {quotaLabel}
        </p>
        {displayPercent != null && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full ${metric.status === "limit_reached" ? "bg-red-500" : metric.status === "warning" ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${displayPercent}%` }}
            />
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {!metric.complete
            ? "Merenje trenutno nije dostupno"
            : metric.percent == null
              ? "Soft kvota za ovaj resurs nije određena"
              : `${metric.percent.toFixed(1)}% ${planLabel} soft limita`}
        </p>
        {metric.status && (
          <p
            className={`mt-1 text-xs font-semibold ${STATUS_CLASSES[metric.status]}`}
          >
            {STATUS_LABELS[metric.status]}
          </p>
        )}
      </div>
    </div>
  );
}

export function StorageMetrics({ resourceUsage }: StorageMetricsProps) {
  const planLabel = PLAN_DISPLAY_NAMES[resourceUsage.plan];

  return (
    <div className="space-y-4">
      <MetricCard
        icon={
          <CircleStackIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        }
        title="Podaci"
        subtitle="MongoDB tenant estimate"
        metric={resourceUsage.mongo}
        planLabel={planLabel}
      />
      <MetricCard
        icon={
          <CloudArrowUpIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        }
        title="Mediji"
        subtitle="Cloudinary / slike i fajlovi"
        metric={resourceUsage.cloudinary}
        planLabel={planLabel}
      />
      <p className="px-1 text-[10px] text-gray-400 dark:text-gray-600">
        Poslednje ažurirano: {formatDate(resourceUsage.updatedAt)}. MongoDB
        vrednost je procena tenant dokumenata. Cloudinary soft kvota još nije
        određena.
        {resourceUsage.cloudinaryAssets != null
          ? ` Izmereno assets: ${resourceUsage.cloudinaryAssets}.`
          : ""}
      </p>
      {resourceUsage.status === "limit_reached" &&
        resourceUsage.plan === "claudia" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            Dostigli ste kapacitet uključen u Claudia plan. Kiki plan uključuje
            veći kapacitet.
          </div>
        )}
    </div>
  );
}
