"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCampaignAnalytics } from "@/hooks/campaigns/useAnalytics";
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

export default function CampaignAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCampaignAnalytics(id);

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <AnimatedCardSkeleton key={i} />
          ))}
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-500 mb-4">Analytics nisu dostupni.</p>
        <Link href={`/marketing/campaigns/${id}`} className="text-violet-600 text-sm font-medium">
          Nazad
        </Link>
      </div>
    );
  }

  const { campaign, metrics, timeline, abTest } = data;

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("sr-RS") : "—";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/marketing/campaigns/${id}`}
          className="text-xs text-gray-400 hover:text-violet-500 transition-colors flex items-center gap-1 mb-3"
        >
          <BackChevron />
          Pregled kampanje
        </Link>
        <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-1">
          Analytics
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {campaign.topic}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {campaign.salonName}
          {campaign.sentAt && (
            <span className="ml-2 text-gray-400">
              · Poslato {fmtDate(campaign.sentAt)}
            </span>
          )}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AnimatedCard
          label="Primaoci"
          value={metrics.recipients}
          sub="ukupno poslato"
          color="violet"
          delay={0}
        />
        <AnimatedCard
          label="Otvoreno"
          value={metrics.opens}
          sub={`${metrics.openRate}% open rate`}
          color="blue"
          delay={0.08}
        />
        <AnimatedCard
          label="Kliknuto"
          value={metrics.clicks}
          sub={`${metrics.clickRate}% click rate`}
          color="green"
          delay={0.16}
        />
        <AnimatedCard
          label="Isporučeno"
          value={metrics.delivered}
          sub="bez bounce-a"
          color="amber"
          delay={0.24}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Opens over time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6"
        >
          <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
            Otvaranja kroz vreme
          </h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Nema podataka za prikaz
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="opens"
                  name="Otvaranja"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Clicks bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6"
        >
          <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
            Klikovi kroz vreme
          </h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Nema podataka za prikaz
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="clicks" name="Klikovi" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* A/B Test section */}
      {abTest && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-5"
        >
          <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
            A/B Subject Test rezultati
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {abTest.variants.map((v) => {
              const isWinner = v.id === abTest.winnerId;
              return (
                <div
                  key={v.id}
                  className={`rounded-xl border-2 p-4 ${
                    isWinner
                      ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isWinner
                          ? "bg-violet-600 text-white"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      Varijanta {v.id}
                    </span>
                    {isWinner && (
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                        Pobednik
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                    &ldquo;{v.subject}&rdquo;
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Poslato", val: v.sent },
                      { label: "Otvoreno", val: v.opened },
                      { label: "Open Rate", val: `${v.openRate}%` },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {m.label}
                        </p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                          {m.val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* A vs B bar chart */}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={abTest.variants}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="id"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v: string) => `Var. ${v}`}
              />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} unit="%" domain={[0, 100]} />
              <Tooltip
                formatter={(val) => [`${val}%`, "Open Rate"]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="openRate" name="Open Rate" radius={[6, 6, 0, 0]}>
                {abTest.variants.map((v) => (
                  <rect
                    key={v.id}
                    fill={v.id === abTest.winnerId ? "#7c3aed" : "#d1d5db"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
