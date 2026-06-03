"use client";

import {
  PLAN_DISPLAY_NAMES,
  PLAN_BADGE_COLORS,
} from "@/lib/plans/planFeatures";
import type { PlanFeatures, PlanName } from "@/lib/plans/planFeatures";

interface PlanInfoCardProps {
  plan: PlanName;
  status: "active" | "suspended" | "pending" | "cancelled";
  isTrialActive: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  features: PlanFeatures;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivan",
  suspended: "Suspendovan",
  pending: "Na čekanju",
  cancelled: "Otkazan",
};

const STATUS_CLASSES: Record<string, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

function formatLimit(value: number, unit: string): string {
  if (value === -1) return "Neograničeno";
  return `${value} ${unit}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sr-RS", { dateStyle: "long" }).format(
    new Date(iso),
  );
}

export function PlanInfoCard({
  plan,
  status,
  isTrialActive,
  trialEndsAt,
  planExpiresAt,
  features,
}: PlanInfoCardProps) {
  const expiryDate = isTrialActive ? trialEndsAt : planExpiresAt;
  const expiryLabel = isTrialActive ? "Trial ističe" : "Plan ističe";

  const limits: { label: string; value: string }[] = [
    {
      label: "Prostor za podatke",
      value: formatLimit(features.dbStorageGb, "GB"),
    },
    {
      label: "AI zahtevi / mesec",
      value: formatLimit(features.aiRequestsPerMonth, ""),
    },
    {
      label: "Newsletter pretplatnici",
      value: formatLimit(features.newsletterSubscribers, ""),
    },
    {
      label: "Zaposleni",
      value: formatLimit(features.staffMembers, ""),
    },
  ];

  return (
    <div className="admin-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Left: plan + status badges */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Aktivan plan
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${PLAN_BADGE_COLORS[plan]}`}
            >
              {PLAN_DISPLAY_NAMES[plan]}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                STATUS_CLASSES[status] ??
                "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
            {isTrialActive && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                Trial aktivan
              </span>
            )}
          </div>

          {expiryDate && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {expiryLabel}:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {formatDate(expiryDate)}
              </span>
            </p>
          )}
        </div>

        {/* Right: upgrade button — skrol na kartice planova u istom tabu */}
        <a
          href="#planovi"
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
        >
          Obnovi / Unapredi plan
        </a>
      </div>

      {/* Limits grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {limits.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {label}
            </p>
            <p className="mt-1 text-sm font-bold text-gray-800 dark:text-gray-100">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
