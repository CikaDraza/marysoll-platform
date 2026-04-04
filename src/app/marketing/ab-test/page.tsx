"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAggregatedAnalytics } from "@/hooks/campaigns/useAnalytics";

function BackChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AbTestPage() {
  const { data, isLoading } = useAggregatedAnalytics();

  const abCampaigns = data?.campaigns.filter((c) => c.hasAbTest) ?? [];

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/marketing"
          className="text-xs text-gray-400 hover:text-violet-500 transition-colors flex items-center gap-1 mb-3"
        >
          <BackChevron />
          Marketing
        </Link>
        <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">
          Marketing
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          A/B Subject Test
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Poređenje varijanti subject linije — pronađi pobedničku formulu
        </p>
      </div>

      {/* How it works info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 mb-6"
      >
        <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2">
          Kako funkcioniše
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Kada kreiraš kampanju sa A/B testom, polovina primaoca dobija <strong>Varijantu A</strong>,
          a druga polovina <strong>Varijantu B</strong>. Varijanta sa višim open rate-om automatski postaje
          pobednik. Postavi A/B test u Email Campaign AI wizardu.
        </p>
      </motion.div>

      {/* List of A/B campaigns */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 animate-pulse"
            >
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : abCampaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-amber-500">
              <path
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Nema kampanja sa A/B testom. Uključi A/B test u Email Campaign AI wizardu.
          </p>
          <Link
            href="/dashboard?tab=email-campaign-ai"
            className="text-sm text-amber-600 font-medium hover:text-amber-700"
          >
            Otvori Email Campaign AI
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {abCampaigns.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {c.topic}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{c.subject}</p>
                </div>
                <Link
                  href={`/marketing/campaigns/${c.id}/analytics`}
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 whitespace-nowrap flex-shrink-0"
                >
                  Detalji →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Primaoci", val: c.metrics.recipients },
                  { label: "Open Rate", val: `${c.metrics.openRate}%` },
                  { label: "Click Rate", val: `${c.metrics.clickRate}%` },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center"
                  >
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">
                      {m.label}
                    </p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {m.val}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Za detaljne A/B rezultate po varijantama, otvori stranicu kampanje.
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
