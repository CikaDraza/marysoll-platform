"use client";

import { motion } from "framer-motion";

interface AnimatedCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "violet" | "blue" | "green" | "amber" | "red";
  delay?: number;
  icon?: React.ReactNode;
}

const colorMap = {
  violet: {
    bg: "bg-violet-50 dark:bg-violet-900/20",
    text: "text-violet-700 dark:text-violet-300",
    label: "text-violet-500",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    label: "text-blue-500",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
    label: "text-green-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    label: "text-amber-500",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
    label: "text-red-500",
  },
};

export function AnimatedCard({
  label,
  value,
  sub,
  color = "violet",
  delay = 0,
  icon,
}: AnimatedCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 ${c.bg} p-5 flex flex-col gap-1`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${c.label}`}>
          {label}
        </p>
        {icon && <span className={c.label}>{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
      {sub && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
      )}
    </motion.div>
  );
}

/** Skeleton placeholder while data loads */
export function AnimatedCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-5 animate-pulse">
      <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}
