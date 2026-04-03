// components/email-campaign/CampaignOptimizationPanel.tsx
"use client";

import { useState } from "react";
import { PanelCard } from "@/components/shared/PanelCard";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { AIResultCard } from "@/components/shared/AIResultCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useSaveDraft } from "@/hooks/emailCampaign/useSaveDraft";
import { useScheduleCampaign } from "@/hooks/emailCampaign/useScheduleCampaign";
import type {
  EmailCampaignContent,
  EmailCampaignOptimization,
  EmailCampaignStrategy,
  EmailCampaignTemplate,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

interface Props {
  optimization?: EmailCampaignOptimization | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onReset: () => void;
  // Passed from parent to build save payload
  salonProfileId?: string;
  topic?: string;
  tone?: string;
  strategy?: EmailCampaignStrategy;
  content?: EmailCampaignContent;
  template?: EmailCampaignTemplate;
  aiCallCount?: number;
}

export function CampaignOptimizationPanel({
  optimization,
  isLoading,
  error,
  onRetry,
  onReset,
  salonProfileId,
  topic,
  tone,
  strategy,
  content,
  template,
  aiCallCount = 0,
}: Props) {
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [sendAt, setSendAt] = useState("");
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const saveDraftMutation = useSaveDraft();
  const scheduleMutation = useScheduleCampaign();

  if (isLoading) {
    return (
      <PanelCard>
        <LoadingState message="Analiziram i optimizujem kampanju..." />
      </PanelCard>
    );
  }

  if (error) {
    return (
      <PanelCard>
        <ErrorState message={error} onRetry={onRetry} />
      </PanelCard>
    );
  }

  if (!optimization) return null;

  const openRatePercent = (optimization.expectedOpenRate * 100).toFixed(1);
  const clickRatePercent = (optimization.expectedClickRate * 100).toFixed(1);
  const confidencePercent =
    optimization.confidenceScore != null
      ? (optimization.confidenceScore * 100).toFixed(0)
      : null;

  // Estimated tokens: ~750 per AI call (rough average for DeepSeek)
  const estimatedTokens = aiCallCount * 750;

  const handleSaveDraft = () => {
    if (!salonProfileId || !topic || !tone) return;
    saveDraftMutation.mutate(
      {
        campaignId: savedCampaignId ?? undefined,
        salonProfileId,
        topic,
        tone,
        strategy,
        content,
        template,
        optimization,
      },
      {
        onSuccess: (data) => {
          setSavedCampaignId(data.campaignId);
        },
      },
    );
  };

  const handleSchedule = () => {
    if (!savedCampaignId || !sendAt) return;
    scheduleMutation.mutate(
      { campaignId: savedCampaignId, sendAt },
      {
        onSuccess: () => {
          setShowScheduleForm(false);
        },
      },
    );
  };

  const isScheduled = scheduleMutation.isSuccess;

  return (
    <PanelCard>
      <PanelHeader
        title="Optimizacija kampanje"
        description="AI preporuke za poboljšanje performansi email kampanje."
        badge="Korak 4 ✓"
        badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      />

      <div className="space-y-3">
        {/* Predicted metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-4 text-center">
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
              Očekivani Open Rate
            </p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {openRatePercent}%
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 text-center">
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
              Očekivani Click Rate
            </p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {clickRatePercent}%
            </p>
          </div>
        </div>

        {/* Confidence score */}
        {confidencePercent !== null && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                AI Confidence Score
              </p>
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                {confidencePercent}%
              </span>
            </div>
            <div className="h-1.5 bg-violet-200 dark:bg-violet-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>
        )}

        <AIResultCard
          label="Optimizovana subject linija"
          value={optimization.improvedSubject}
          highlight
        />

        <AIResultCard
          label="Optimizovani preview tekst"
          value={optimization.improvedPreview}
        />

        <AIResultCard label="AI preporuke za poboljšanje">
          <ul className="space-y-2 mt-2">
            {optimization.suggestions.map((suggestion, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200"
              >
                <span className="text-amber-500 font-bold shrink-0 mt-0.5">
                  💡
                </span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </AIResultCard>
      </div>

      {/* Summary footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span>🎉</span>
          <span>
            Kampanja je kompletno generisana i optimizovana.
          </span>
        </div>

        {/* UsageStats inline */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2">
          <span>⚡ {aiCallCount} AI poziva</span>
          <span>·</span>
          <span>~{estimatedTokens.toLocaleString()} tokena</span>
          {savedCampaignId && (
            <>
              <span>·</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ Sačuvano
              </span>
            </>
          )}
          {isScheduled && (
            <>
              <span>·</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                📅 Zakazano
              </span>
            </>
          )}
        </div>

        {/* Save draft error */}
        {saveDraftMutation.isError && (
          <p className="text-xs text-red-500">
            {saveDraftMutation.error?.message ?? "Greška pri čuvanju nacrta"}
          </p>
        )}

        {/* Schedule error */}
        {scheduleMutation.isError && (
          <p className="text-xs text-red-500">
            {scheduleMutation.error?.message ?? "Greška pri zakazivanju"}
          </p>
        )}

        {/* Schedule form */}
        {showScheduleForm && savedCampaignId && !isScheduled && (
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={sendAt}
              onChange={(e) => setSendAt(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              onClick={handleSchedule}
              disabled={!sendAt || scheduleMutation.isPending}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {scheduleMutation.isPending ? "..." : "Zakaži"}
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {!isScheduled && (
            <button
              onClick={handleSaveDraft}
              disabled={
                !salonProfileId ||
                !topic ||
                !tone ||
                saveDraftMutation.isPending
              }
              className="flex-1 py-2.5 px-4 bg-violet-600 text-white rounded-xl font-medium text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {saveDraftMutation.isPending
                ? "Čuvam..."
                : savedCampaignId
                  ? "✓ Ažuriraj nacrt"
                  : "💾 Sačuvaj nacrt"}
            </button>
          )}

          {savedCampaignId && !isScheduled && (
            <button
              onClick={() => setShowScheduleForm((v) => !v)}
              className="flex-1 py-2.5 px-4 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 rounded-xl font-medium text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition cursor-pointer"
            >
              📅 Zakaži slanje
            </button>
          )}
        </div>

        <button
          onClick={onReset}
          className="w-full py-2.5 px-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
        >
          ↺ Nova kampanja
        </button>
      </div>
    </PanelCard>
  );
}
