"use client";

import { usePlanStatus } from "@/hooks/usePlanStatus";
import { PlanStatusBanner } from "./PlanStatusBanner";
import { PlanInfoCard } from "./PlanInfoCard";
import { FeaturesList } from "./FeaturesList";
import { StorageMetrics } from "./StorageMetrics";
import { AISettingsCard } from "./AISettingsCard";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="admin-card h-32 animate-pulse p-6"
        />
      ))}
    </div>
  );
}

export function AdminPlanStatus() {
  const { data, isLoading, isError } = usePlanStatus();

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
    </div>
  );
}
