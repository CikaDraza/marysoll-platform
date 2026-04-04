"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAggregatedAnalytics } from "@/hooks/campaigns/useAnalytics";
import { AnimatedCard, AnimatedCardSkeleton } from "@/components/motion/AnimatedCard";

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

export default function CampaignAnalyticsOverviewPage() {
  const { data, isLoading } = useAggregatedAnalytics();

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
        <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-1">
          Marketing
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Campaign Analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ukupni pregled performansi tvojih email kampanja
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          [...Array(4)].map((_, i) => <AnimatedCardSkeleton key={i} />)
        ) : (
          <>
            <AnimatedCard
              label="Kampanja"
              value={data?.summary.totalCampaigns ?? 0}
              sub="ukupno poslato"
              color="violet"
              delay={0}
            />
            <AnimatedCard
              label="Avg Open Rate"
              value={`${data?.summary.avgOpenRate ?? 0}%`}
              sub="prosek svih kampanja"
              color="blue"
              delay={0.08}
            />
            <AnimatedCard
              label="Avg Click Rate"
              value={`${data?.summary.avgClickRate ?? 0}%`}
              sub="prosek svih kampanja"
              color="green"
              delay={0.16}
            />
            <AnimatedCard
              label="Ukupno primaoci"
              value={(data?.summary.totalRecipients ?? 0).toLocaleString()}
              sub="kumulativno"
              color="amber"
              delay={0.24}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Monthly trend — campaigns count */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6"
        >
          <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
            Kampanje po mesecu
          </h2>
          {isLoading || !data?.trend.length ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-gray-400">
                {isLoading ? "Učitavanje..." : "Nema podataka"}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.trend}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar
                  dataKey="campaigns"
                  name="Kampanje"
                  fill="#7c3aed"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Monthly open/click rate trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6"
        >
          <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
            Open &amp; Click Rate trend
          </h2>
          {isLoading || !data?.trend.length ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-gray-400">
                {isLoading ? "Učitavanje..." : "Nema podataka"}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={data.trend}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(val) => [`${val}%`]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgOpenRate"
                  name="Open Rate"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="avgClickRate"
                  name="Click Rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Campaign list */}
      {!isLoading && data && data.campaigns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Po kampanjama
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Kampanja", "Poslato", "Otvoreno", "Kliknuto", "Open Rate", "Click Rate", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={
                      idx % 2 === 0
                        ? "bg-white dark:bg-gray-900"
                        : "bg-gray-50 dark:bg-gray-800/40"
                    }
                  >
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                        {c.topic}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                        {c.subject}
                      </p>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-400">
                      {c.metrics.recipients}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-400">
                      {c.metrics.opens}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-400">
                      {c.metrics.clicks}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-violet-600 dark:text-violet-400 font-medium">
                        {c.metrics.openRate}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {c.metrics.clickRate}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/marketing/campaigns/${c.id}/analytics`}
                        className="text-xs font-medium text-violet-600 hover:text-violet-700"
                      >
                        Detalji
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {!isLoading && data?.campaigns.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-sm text-gray-400">
            Nema poslanih kampanja za prikaz. Pošalji prvu kampanju da vidiš analytics.
          </p>
          <Link
            href="/marketing/campaigns/drafts"
            className="mt-4 inline-block text-sm text-violet-600 font-medium"
          >
            Idi na kampanje
          </Link>
        </div>
      )}
    </div>
  );
}
