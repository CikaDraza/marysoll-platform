"use client";

import Link from "next/link";

export default function CampaignAnalyticsPage() {
  return (
    <div>
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
        <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-1">
          Marketing
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Campaign Analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Detaljni uvid u performanse tvojih email kampanja
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white mb-4 shadow-lg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 20V10M12 20V4M6 20v-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
          Uskoro dostupno
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Campaign Analytics modul je u razvoju. Uskoro ćeš moći da pratiš
          open rate, click rate i konverzije po kampanjama.
        </p>
        <span className="mt-4 inline-block text-[10px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
