// components/email-campaign/strategist/CampaignStrategistPanel.tsx
"use client";

import { useState } from "react";
import { PanelCard } from "@/components/shared/PanelCard";
import { PanelHeader } from "@/components/shared/PanelHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SalonSelector } from "@/components/shared/SalonSelector";
import type { EmailCampaignTone } from "@/types/ai/email-campaign/aiEmailCampaign.types";
import type { GenerateStrategyInput } from "@/hooks/emailCampaign/useGenerateStrategy";

const TONES: { value: EmailCampaignTone; label: string; icon: string }[] = [
  { value: "informative", label: "Informativno", icon: "📋" },
  { value: "friendly", label: "Prijateljski", icon: "😊" },
  { value: "urgent", label: "Hitno", icon: "⚡" },
  { value: "luxury", label: "Luksuzno", icon: "✨" },
  { value: "seasonal", label: "Sezonsko", icon: "🌸" },
];

const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";

interface Props {
  onGenerate: (input: GenerateStrategyInput) => void;
  isLoading: boolean;
  error?: string | null;
}

export function CampaignStrategistPanel({ onGenerate, isLoading, error }: Props) {
  const [salonIds, setSalonIds] = useState<string[]>([]);
  const [showSalonError, setShowSalonError] = useState(false);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<EmailCampaignTone>("friendly");
  const [analyticsMode, setAnalyticsMode] = useState<"average" | "last">("last");

  const handleSubmit = () => {
    if (salonIds.length === 0) {
      setShowSalonError(true);
      return;
    }
    if (!topic.trim()) return;

    onGenerate({
      salonIds,
      topic: topic.trim(),
      audience: audience.trim() || undefined,
      tone,
      useAverage: analyticsMode === "average",
    });
  };

  return (
    <PanelCard>
      <PanelHeader
        title="Kampanja Input"
        description="Izaberite salon i popunite podatke. AI će generisati strategiju na osnovu vaših podataka i istorije kampanja."
        badge="Korak 1"
      />

      <div className="space-y-4">
        <div>
          <label className={lbl}>Salon *</label>
          <SalonSelector
            value={salonIds}
            onChange={(ids) => {
              setSalonIds(ids);
              if (ids.length > 0) setShowSalonError(false);
            }}
            showError={showSalonError}
          />
        </div>

        <div>
          <label className={lbl}>Tema kampanje *</label>
          <input
            className={inp}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="npr. Prolećna ponuda gel laka, Black Friday popust..."
          />
        </div>

        <div>
          <label className={lbl}>Ciljna publika (opciono)</label>
          <input
            className={inp}
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="npr. Stalne klijentice, novi klijenti, VIP klijenti..."
          />
        </div>

        <div>
          <label className={lbl}>Ton komunikacije *</label>
          <div className="grid grid-cols-5 gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={[
                  "flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition cursor-pointer",
                  tone === t.value
                    ? "border-violet-400 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300",
                ].join(" ")}
              >
                <span className="text-xl">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={lbl}>Režim analitike</label>
          <div className="flex gap-3">
            {(["last", "average"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setAnalyticsMode(mode)}
                className={[
                  "flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer",
                  analyticsMode === mode
                    ? "border-violet-400 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300",
                ].join(" ")}
              >
                {mode === "last" ? "🕐 Poslednja kampanja" : "📊 Prosek"}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorState message={error} />}

        {isLoading ? (
          <LoadingState message="Generišem strategiju kampanje..." />
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!topic.trim()}
            className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            ✨ Generiši strategiju
          </button>
        )}
      </div>
    </PanelCard>
  );
}
