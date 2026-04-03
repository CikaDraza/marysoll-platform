// components/email-campaign/CampaignContentPanel.tsx
"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

interface Props {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function CampaignContentPanel({ isLoading, error, onRetry }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <LoadingState message="Generišem sadržaj email kampanje..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  return null;
}
