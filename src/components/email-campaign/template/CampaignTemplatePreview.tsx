// components/email-campaign/CampaignTemplatePreview.tsx
"use client";

import { useState } from "react";
import { PanelCard } from "@/components/shared/PanelCard";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { EmailTemplateRenderer } from "@/components/email/EmailTemplateRenderer";
import type { EmailCampaignTemplate } from "@/types/ai/email-campaign/aiEmailCampaign.types";

interface Props {
  template: EmailCampaignTemplate;
  onProceed: () => void;
  isLoading: boolean;
}

export function CampaignTemplatePreview({ template, onProceed, isLoading }: Props) {
  const [viewMode, setViewMode] = useState<"blocks" | "html">("blocks");

  return (
    <PanelCard>
      <PanelHeader
        title="Email Templejt"
        description="HTML templejt generisan na osnovu sadržaja kampanje. Prikazan u block i raw HTML modu."
        badge="Korak 3 ✓"
        badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      />

      {/* View mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode("blocks")}
          className={[
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer",
            viewMode === "blocks"
              ? "bg-violet-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
          ].join(" ")}
        >
          📧 Block preview
        </button>
        <button
          onClick={() => setViewMode("html")}
          className={[
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer",
            viewMode === "html"
              ? "bg-violet-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
          ].join(" ")}
        >
          {"</>"}  HTML source
        </button>
      </div>

      {viewMode === "blocks" ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <EmailTemplateRenderer template={template} preview />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-96">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
            {template.html || JSON.stringify(template.blocks, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>📦</span>
        <span>{template.blocks.length} blokova</span>
        <span>·</span>
        <span>Gmail / Outlook / Apple Mail kompatibilan</span>
      </div>

      <button
        onClick={onProceed}
        disabled={isLoading}
        className="mt-5 w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
      >
        {isLoading ? "Optimizujem kampanju..." : "→ Optimizuj kampanju"}
      </button>
    </PanelCard>
  );
}
