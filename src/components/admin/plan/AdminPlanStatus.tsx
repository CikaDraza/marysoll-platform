"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { PlanStatusBanner } from "./PlanStatusBanner";
import { PlanInfoCard } from "./PlanInfoCard";
import { FeaturesList } from "./FeaturesList";
import { StorageMetrics } from "./StorageMetrics";
import { AISettingsCard } from "./AISettingsCard";
import { UpgradePlans } from "./UpgradePlans";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="admin-card h-32 animate-pulse p-6" />
      ))}
    </div>
  );
}

/** Banner + osvežavanje statusa nakon uspešnog Paddle checkout-a. */
function useCheckoutSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Snimi success jednom pri mount-u (pre nego što očistimo URL u effect-u).
  const [showSuccess, setShowSuccess] = useState(
    () => searchParams.get("checkout") === "success",
  );

  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;

    queryClient.invalidateQueries({ queryKey: ["planStatus"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });

    // Očisti query param da se banner ne prikazuje pri refresh-u.
    router.replace("/dashboard?tab=pretplata", { scroll: false });
  }, [searchParams, router, queryClient]);

  return { showSuccess, dismiss: () => setShowSuccess(false) };
}

export function AdminPlanStatus() {
  const { data, isLoading, isError } = usePlanStatus();
  const { showSuccess, dismiss } = useCheckoutSuccess();

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !data) {
    return (
      <div className="admin-card p-6">
        <p className="text-sm text-red-500">
          Greška pri učitavanju podataka o pretplati. Pokušajte ponovo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Plaćanje je uspešno primljeno. Vaš plan se ažurira — može potrajati
            koji trenutak.
          </p>
          <button
            onClick={dismiss}
            className="shrink-0 text-green-600 hover:text-green-800 dark:text-green-400"
            aria-label="Zatvori"
          >
            ✕
          </button>
        </div>
      )}

      <PlanStatusBanner
        status={data.status}
        isTrialActive={data.isTrialActive}
        trialEndsAt={data.trialEndsAt}
        storageMetrics={data.storageMetrics}
        features={data.features}
      />

      <PlanInfoCard
        plan={data.plan}
        status={data.status}
        isTrialActive={data.isTrialActive}
        trialEndsAt={data.trialEndsAt}
        planExpiresAt={data.planExpiresAt}
        features={data.features}
      />

      <FeaturesList features={data.features} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StorageMetrics
          storageMetrics={data.storageMetrics}
          dbStorageGb={data.features.dbStorageGb}
        />
        <AISettingsCard aiSettings={data.aiSettings} />
      </div>

      <UpgradePlans />
    </div>
  );
}
