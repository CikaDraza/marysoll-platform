"use client";

import Link from "next/link";
import { useState } from "react";
import type { CampaignStatus } from "@/models/EmailCampaign";

export interface CampaignRow {
  _id: string;
  topic: string;
  salonName: string;
  scheduling: {
    status: CampaignStatus;
    sendAt?: string;
    sentAt?: string;
  };
  content?: { subject?: string };
  optimization?: { optimizedSubject?: string };
  createdAt: string;
  updatedAt: string;
}

interface Props {
  campaigns: CampaignRow[];
  status: CampaignStatus;
  isLoading: boolean;
  onSchedule?: (campaign: CampaignRow) => void;
}

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

function fmt(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleString("sr-RS", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── ScheduleModal ─────────────────────────────────────────────────────────────

interface ScheduleModalProps {
  campaign: CampaignRow;
  onClose: () => void;
  onConfirm: (sendAt: string) => void;
  isSaving: boolean;
}

function ScheduleModal({
  campaign,
  onClose,
  onConfirm,
  isSaving,
}: ScheduleModalProps) {
  const [sendAt, setSendAt] = useState(
    campaign.scheduling.sendAt
      ? new Date(campaign.scheduling.sendAt).toISOString().slice(0, 16)
      : "",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Zakaži slanje
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {campaign.topic}
          </span>
        </p>

        <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
          Datum i vreme slanja
        </label>
        <input
          type="datetime-local"
          value={sendAt}
          onChange={(e) => setSendAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Otkaži
          </button>
          <button
            onClick={() => sendAt && onConfirm(new Date(sendAt).toISOString())}
            disabled={!sendAt || isSaving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
          >
            {isSaving ? "Zakazujem..." : "Zakaži"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CampaignTable ─────────────────────────────────────────────────────────────

export function CampaignTable({ campaigns, status, isLoading, onSchedule }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    const emptyLabels: Record<CampaignStatus, string> = {
      draft: "Nema nacrta kampanja",
      scheduled: "Nema zakazanih kampanja",
      sending: "Nema kampanja u slanju",
      sent: "Nema poslatih kampanja",
      failed: "Nema neuspelih kampanja",
    };

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            className="text-gray-400"
          >
            <path
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {emptyLabels[status]}
        </p>
        {status === "draft" && (
          <Link
            href="/dashboard?tab=email-campaign-ai"
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            Kreiraj kampanju
          </Link>
        )}
      </div>
    );
  }

  const showSchedule = status === "draft" || status === "scheduled";
  const showSentAt = status === "sent";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Naziv kampanje
            </th>
            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Status
            </th>
            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Kreirano
            </th>
            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {showSentAt ? "Poslato" : "Zadnja izmena"}
            </th>
            {showSchedule && (
              <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Zakazano za
              </th>
            )}
            <th className="text-right py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Akcije
            </th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const subject =
              c.optimization?.optimizedSubject || c.content?.subject || c.topic;
            return (
              <tr
                key={c._id}
                className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
              >
                <td className="py-3.5 px-4">
                  <Link
                    href={`/marketing/campaigns/${c._id}`}
                    className="font-medium text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    {c.topic}
                  </Link>
                  {subject !== c.topic && (
                    <p className="text-[12px] text-gray-400 mt-0.5 truncate max-w-[280px]">
                      {subject}
                    </p>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[c.scheduling.status]}`}
                  >
                    {STATUS_LABEL[c.scheduling.status]}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {fmt(c.createdAt)}
                </td>
                <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {showSentAt ? fmtTime(c.scheduling.sentAt) : fmt(c.updatedAt)}
                </td>
                {showSchedule && (
                  <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {c.scheduling.sendAt ? fmtTime(c.scheduling.sendAt) : "—"}
                  </td>
                )}
                <td className="py-3.5 px-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/marketing/campaigns/${c._id}`}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Pregled
                    </Link>
                    {status === "draft" && (
                      <Link
                        href={`/marketing/campaigns/${c._id}/edit`}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Izmeni
                      </Link>
                    )}
                    {showSchedule && onSchedule && (
                      <button
                        onClick={() => onSchedule(c)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                      >
                        Zakaži
                      </button>
                    )}
                    {status === "draft" && (
                      <Link
                        href={`/marketing/campaigns/${c._id}/delete`}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Obriši
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { ScheduleModal };
