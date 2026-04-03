// components/email-campaign/CampaignStrategyPreview.tsx
"use client";

import { PanelCard } from "@/components/shared/PanelCard";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { AIResultCard } from "@/components/shared/AIResultCard";
import type { EmailCampaignStrategy } from "@/types/ai/email-campaign/aiEmailCampaign.types";

interface Props {
  strategy: EmailCampaignStrategy;
  onProceed: () => void;
  isLoading: boolean;
}

export function CampaignStrategyPreview({ strategy, onProceed, isLoading }: Props) {
  return (
    <PanelCard>
      <PanelHeader
        title="Strategija kampanje"
        description="AI je generisao strategiju na osnovu vaših podataka. Pregledajte i nastavite."
        badge="Korak 1 ✓"
        badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      />

      <div className="space-y-3">
        <AIResultCard label="Cilj kampanje" value={strategy.campaignGoal} highlight />

        <AIResultCard label="Ciljna publika" value={strategy.targetAudience} />

        <AIResultCard label="Preporučeno vreme slanja" value={strategy.recommendedSendTime} />

        <AIResultCard label="Predložene subject linije">
          <div className="space-y-1.5 mt-1">
            {strategy.suggestedSubjectLines.map((line, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200"
              >
                <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </AIResultCard>

        <AIResultCard label="Preview tekstovi">
          <div className="space-y-1.5 mt-1">
            {strategy.previewTexts.map((text, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400 italic"
              >
                <span className="not-italic font-bold text-gray-400">{i + 1}.</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </AIResultCard>

        {strategy.reasoning && (
          <AIResultCard label="Obrazloženje">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
              {strategy.reasoning}
            </p>
          </AIResultCard>
        )}
      </div>

      <button
        onClick={onProceed}
        disabled={isLoading}
        className="mt-5 w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
      >
        {isLoading ? "Generišem sadržaj..." : "→ Generiši sadržaj"}
      </button>
    </PanelCard>
  );
}
