"use client";

import Link from "next/link";

export default function AbTestPage() {
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
          A/B Subject Test
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Testiraj različite subject linije i pronađi pobedničku varijantu
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white mb-4 shadow-lg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
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
          A/B Subject Test modul je u razvoju. Uskoro ćeš moći da testiraš
          više varijanti subject linije i automatski proglasisš pobednika.
        </p>
        <span className="mt-4 inline-block text-[10px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
