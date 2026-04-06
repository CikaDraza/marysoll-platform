"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CampaignTable, ScheduleModal } from "./CampaignTable";
import type { CampaignRow } from "./CampaignTable";
import { useCampaigns, useScheduleCampaignFromList } from "@/hooks/campaigns/useCampaigns";
import type { CampaignStatus } from "@/models/EmailCampaign";

const TABS: { label: string; status: CampaignStatus; href: string }[] = [
  { label: "Drafts", status: "draft", href: "/marketing/campaigns/drafts" },
  {
    label: "Scheduled",
    status: "scheduled",
    href: "/marketing/campaigns/scheduled",
  },
  { label: "Sent", status: "sent", href: "/marketing/campaigns/sent" },
  { label: "Failed", status: "failed", href: "/marketing/campaigns/failed" },
];

interface Props {
  status: CampaignStatus;
}

export function CampaignsListPage({ status }: Props) {
  const pathname = usePathname();
  const { data: campaigns = [], isLoading } = useCampaigns(status);
  const scheduleMutation = useScheduleCampaignFromList();

  const [schedulingCampaign, setSchedulingCampaign] =
    useState<CampaignRow | null>(null);

  const handleScheduleConfirm = async (sendAt: string) => {
    if (!schedulingCampaign) return;
    await scheduleMutation.mutateAsync({
      campaignId: schedulingCampaign._id,
      sendAt,
    });
    setSchedulingCampaign(null);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/marketing"
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
          Marketing
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-1">
              Email Campaign AI
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Kampanje
            </h1>
          </div>
          <Link
            href="/dashboard?tab=email-campaign-ai"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Nova kampanja
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-5 w-fit">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={t.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              pathname === t.href
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <CampaignTable
          campaigns={campaigns}
          status={status}
          isLoading={isLoading}
          onSchedule={(c) => setSchedulingCampaign(c)}
        />
      </div>

      {/* Schedule modal */}
      {schedulingCampaign && (
        <ScheduleModal
          campaign={schedulingCampaign}
          onClose={() => setSchedulingCampaign(null)}
          onConfirm={handleScheduleConfirm}
          isSaving={scheduleMutation.isPending}
        />
      )}
    </div>
  );
}
