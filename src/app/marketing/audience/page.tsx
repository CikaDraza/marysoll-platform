"use client";

import Link from "next/link";

export default function AudiencePage() {
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
          Audience Segmentation
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Segmentiraj klijente po ponašanju, lokaciji i aktivnosti
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mb-4 shadow-lg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
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
          Audience Segmentation modul je u razvoju. Uskoro ćeš moći da
          kreiraš segmente klijenata i ciljaš kampanje na pravu publiku.
        </p>
        <span className="mt-4 inline-block text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
