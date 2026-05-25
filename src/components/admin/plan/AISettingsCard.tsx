"use client";

import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import type { PlanStatusData } from "@/hooks/usePlanStatus";

interface AISettingsCardProps {
  aiSettings: PlanStatusData["aiSettings"];
}

interface AIFeatureRowProps {
  label: string;
  enabled: boolean;
  rpmLimit: number;
}

function AIFeatureRow({ label, enabled, rpmLimit }: AIFeatureRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
      <div className="flex items-center gap-2">
        {enabled ? (
          <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
        ) : (
          <XCircleIcon className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
        )}
        <span
          className={`text-sm ${
            enabled
              ? "text-gray-700 dark:text-gray-200"
              : "text-gray-400 dark:text-gray-600"
          }`}
        >
          {label}
        </span>
      </div>
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        {rpmLimit} zahteva/min
      </span>
    </div>
  );
}

export function AISettingsCard({ aiSettings }: AISettingsCardProps) {
  return (
    <div className="admin-card p-5">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        AI podešavanja
      </p>

      <div className="space-y-2">
        <AIFeatureRow
          label="AI chat asistent"
          enabled={aiSettings.chatEnabled}
          rpmLimit={aiSettings.chatRpmLimit}
        />
        <AIFeatureRow
          label="AI landing stranice"
          enabled={aiSettings.landingEnabled}
          rpmLimit={aiSettings.landingRpmLimit}
        />
        <AIFeatureRow
          label="AI generisanje slika"
          enabled={aiSettings.imageEnabled}
          rpmLimit={aiSettings.imageRpmLimit}
        />
      </div>

      <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-600">
        AI limiti su podešeni od strane administratora platforme.
      </p>
    </div>
  );
}
