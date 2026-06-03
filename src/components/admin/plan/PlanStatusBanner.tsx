"use client";

import { ExclamationTriangleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import type { PlanFeatures } from "@/lib/plans/planFeatures";

interface PlanStatusBannerProps {
  status: "active" | "suspended" | "pending" | "cancelled";
  isTrialActive: boolean;
  trialEndsAt: string | null;
  storageMetrics: {
    mongoUsageMb: number;
    cloudinaryUsageMb: number;
  };
  features: PlanFeatures;
}

type BannerSeverity = "error" | "warning";

function getBannerInfo(
  status: string,
  isTrialActive: boolean,
  trialEndsAt: string | null,
  storageMetrics: { mongoUsageMb: number; cloudinaryUsageMb: number },
  features: PlanFeatures,
): { message: string; severity: BannerSeverity } | null {
  if (status === "suspended") {
    return {
      message:
        "Vaš nalog je suspendovan. Kontaktirajte podršku ili nadogradite plan.",
      severity: "error",
    };
  }

  if (status === "cancelled") {
    return {
      message:
        "Vaša pretplata je otkazana. Prelijte na viši plan da biste nastavili koristiti platformu.",
      severity: "error",
    };
  }

  if (isTrialActive && trialEndsAt) {
    const msLeft = new Date(trialEndsAt).getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      return {
        message:
          "Vaš probni period je istekao. Prelijte na viši plan da biste nastavili.",
        severity: "error",
      };
    }
    if (daysLeft <= 3) {
      return {
        message: `Vaš probni period ističe za ${daysLeft} ${daysLeft === 1 ? "dan" : "dana"}. Prelijte na viši plan na vreme.`,
        severity: "warning",
      };
    }
  }

  if (features.dbStorageGb !== -1) {
    const limitMb = features.dbStorageGb * 1024;
    if (limitMb > 0) {
      if (storageMetrics.mongoUsageMb >= limitMb * 0.9) {
        return {
          message:
            "Prostor za podatke je skoro popunjen (90%). Prelijte na viši plan da biste izbegli prekid usluge.",
          severity: "warning",
        };
      }
      if (storageMetrics.cloudinaryUsageMb >= limitMb * 0.9) {
        return {
          message:
            "Prostor za medije je skoro popunjen (90%). Prelijte na viši plan da biste izbegli prekid usluge.",
          severity: "warning",
        };
      }
    }
  }

  return null;
}

export function PlanStatusBanner({
  status,
  isTrialActive,
  trialEndsAt,
  storageMetrics,
  features,
}: PlanStatusBannerProps) {
  const bannerInfo = getBannerInfo(
    status,
    isTrialActive,
    trialEndsAt,
    storageMetrics,
    features,
  );

  if (!bannerInfo) return null;

  const isError = bannerInfo.severity === "error";

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        isError
          ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
          : "border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
      }`}
    >
      {isError ? (
        <XCircleIcon
          className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400"
        />
      ) : (
        <ExclamationTriangleIcon
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400"
        />
      )}
      <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
        <p
          className={`text-sm font-medium ${
            isError
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {bannerInfo.message}
        </p>
        <a
          href="#planovi"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            isError
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-amber-500 text-white hover:bg-amber-600"
          }`}
        >
          Pogledaj planove →
        </a>
      </div>
    </div>
  );
}
