// components/email-campaign/CampaignContentPreview.tsx
"use client";

import { PanelCard } from "@/components/shared/PanelCard";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { AIResultCard } from "@/components/shared/AIResultCard";
import type { EmailCampaignContent } from "@/types/ai/email-campaign/aiEmailCampaign.types";

interface Props {
  content: EmailCampaignContent;
  onProceed: () => void;
  isLoading: boolean;
}

export function CampaignContentPreview({ content, onProceed, isLoading }: Props) {
  return (
    <PanelCard>
      <PanelHeader
        title="Sadržaj kampanje"
        description="AI je kreirao email sadržaj. Pregledajte pre generisanja templejta."
        badge="Korak 2 ✓"
        badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      />

      <div className="space-y-3">
        <AIResultCard label="Subject linija" value={content.subject} highlight />

        {content.previewText && (
          <AIResultCard label="Preview tekst" value={content.previewText} />
        )}

        <AIResultCard label="Naslov emaila" value={content.title} />

        {content.subtitle && (
          <AIResultCard label="Podnaslov" value={content.subtitle} />
        )}

        <AIResultCard label="Telo emaila">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap mt-1">
            {content.body}
          </p>
        </AIResultCard>

        {content.bullets && content.bullets.length > 0 && (
          <AIResultCard label="Ključne tačke">
            <ul className="space-y-1.5 mt-1">
              {content.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span className="text-violet-500 font-bold shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </AIResultCard>
        )}

        <AIResultCard label="CTA tekst" value={content.ctaText} />
      </div>

      <button
        onClick={onProceed}
        disabled={isLoading}
        className="mt-5 w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
      >
        {isLoading ? "Generišem templejt..." : "→ Generiši HTML templejt"}
      </button>
    </PanelCard>
  );
}
