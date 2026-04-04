"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useCampaign, useScheduleCampaignFromList } from "@/hooks/campaigns/useCampaigns";
import { ScheduleModal } from "@/components/campaigns/CampaignTable";
import type { CampaignRow } from "@/components/campaigns/CampaignTable";
import type { CampaignStatus } from "@/models/EmailCampaign";

const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  scheduled:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Zakazano",
  sending: "Šalje se",
  sent: "Poslato",
  failed: "Greška",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
      <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading, error } = useCampaign(id);
  const scheduleMutation = useScheduleCampaignFromList();
  const [showSchedule, setShowSchedule] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Kampanja nije pronađena.
        </p>
        <Link
          href="/marketing/campaigns/drafts"
          className="text-violet-600 hover:text-violet-700 text-sm font-medium"
        >
          Nazad na kampanje
        </Link>
      </div>
    );
  }

  const status = campaign.scheduling.status;
  const isDraft = status === "draft";
  const isScheduled = status === "scheduled";
  const isSent = status === "sent";

  const c = campaign as unknown as {
    topic: string;
    audience?: string;
    tone: string;
    salonName: string;
    strategy?: { keyAngle?: string; promotionIdea?: string };
    content?: {
      subject?: string;
      previewText?: string;
      heroTitle?: string;
      heroText?: string;
      offerTitle?: string;
      offerText?: string;
      ctaText?: string;
      ctaUrl?: string;
    };
    optimization?: {
      optimizedSubject?: string;
      optimizedPreview?: string;
      predictedOpenRate?: number;
      predictedClickRate?: number;
      confidenceScore?: number;
      aiSuggestions?: string[];
    };
    template?: { html?: string };
    metrics?: {
      recipients?: number;
      opens?: number;
      clicks?: number;
      openRate?: number;
      clickRate?: number;
    };
    scheduling: {
      status: CampaignStatus;
      sendAt?: string;
      sentAt?: string;
    };
    createdAt: string;
    updatedAt: string;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/marketing/campaigns/drafts"
          className="text-xs text-gray-400 hover:text-violet-500 transition-colors flex items-center gap-1 mb-3"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Kampanje
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {c.topic}
              </h1>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {c.salonName}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isDraft && (
              <>
                <Link
                  href={`/marketing/campaigns/${id}/edit`}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Izmeni
                </Link>
                <button
                  onClick={() => setShowSchedule(true)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                >
                  Zakaži slanje
                </button>
                <Link
                  href={`/marketing/campaigns/${id}/delete`}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Obriši
                </Link>
              </>
            )}
            {isScheduled && (
              <button
                onClick={() => setShowSchedule(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                Promeni termin
              </button>
            )}
            {isSent && (
              <Link
                href={`/marketing/campaigns/${id}/analytics`}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                Analytics
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-5">
          {/* Content */}
          {c.content && (
            <Section title="Sadržaj email-a">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Subject" value={c.content.subject} />
                <Field label="Preview text" value={c.content.previewText} />
                <Field label="Hero naslov" value={c.content.heroTitle} />
                <Field label="CTA tekst" value={c.content.ctaText} />
                <div className="sm:col-span-2">
                  <Field label="Hero tekst" value={c.content.heroText} />
                </div>
              </div>
            </Section>
          )}

          {/* HTML preview */}
          {c.template?.html && (
            <Section title="HTML Preview">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white">
                <iframe
                  srcDoc={c.template.html}
                  className="w-full h-[500px]"
                  sandbox="allow-same-origin"
                  title="Email preview"
                />
              </div>
            </Section>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-5">
          {/* Scheduling */}
          <Section title="Zakazivanje">
            <div className="space-y-3">
              <Field
                label="Status"
                value={STATUS_LABEL[status]}
              />
              {c.scheduling.sendAt && (
                <Field
                  label="Zakazano za"
                  value={new Date(c.scheduling.sendAt).toLocaleString("sr-RS")}
                />
              )}
              {c.scheduling.sentAt && (
                <Field
                  label="Poslato"
                  value={new Date(c.scheduling.sentAt).toLocaleString("sr-RS")}
                />
              )}
              <Field
                label="Kreirano"
                value={new Date(c.createdAt).toLocaleDateString("sr-RS")}
              />
            </div>
          </Section>

          {/* Optimization */}
          {c.optimization && (
            <Section title="AI Optimizacija">
              <div className="space-y-3">
                <Field
                  label="Poboljšan subject"
                  value={c.optimization.optimizedSubject}
                />
                <Field
                  label="Poboljšan preview"
                  value={c.optimization.optimizedPreview}
                />
                {c.optimization.predictedOpenRate !== undefined && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1">
                        Open rate
                      </p>
                      <p className="text-lg font-bold text-violet-700 dark:text-violet-400">
                        {c.optimization.predictedOpenRate}%
                      </p>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1">
                        Click rate
                      </p>
                      <p className="text-lg font-bold text-violet-700 dark:text-violet-400">
                        {c.optimization.predictedClickRate}%
                      </p>
                    </div>
                  </div>
                )}
                {c.optimization.aiSuggestions &&
                  c.optimization.aiSuggestions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                        AI Sugestije
                      </p>
                      <ul className="space-y-1.5">
                        {c.optimization.aiSuggestions.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                          >
                            <span className="text-violet-500 mt-0.5 flex-shrink-0">
                              •
                            </span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </Section>
          )}

          {/* Metrics */}
          {status === "sent" && c.metrics && (
            <Section title="Metrike">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Poslato", value: c.metrics.recipients },
                  { label: "Otvoreno", value: c.metrics.opens },
                  { label: "Open rate", value: `${c.metrics.openRate}%` },
                  { label: "Click rate", value: `${c.metrics.clickRate}%` },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center"
                  >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {m.label}
                    </p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                      {m.value ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Schedule modal */}
      {showSchedule && (
        <ScheduleModal
          campaign={campaign as unknown as CampaignRow}
          onClose={() => setShowSchedule(false)}
          onConfirm={async (sendAt) => {
            await scheduleMutation.mutateAsync({ campaignId: id, sendAt });
            setShowSchedule(false);
          }}
          isSaving={scheduleMutation.isPending}
        />
      )}
    </div>
  );
}
