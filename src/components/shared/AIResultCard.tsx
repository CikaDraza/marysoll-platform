// components/shared/AIResultCard.tsx
"use client";

import type { ReactNode } from "react";

interface Props {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  highlight?: boolean;
}

export function AIResultCard({ label, value, children, highlight }: Props) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        highlight
          ? "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20"
          : "border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40",
      ].join(" ")}
    >
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
        {label}
      </p>
      {value !== undefined && (
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
          {value}
        </p>
      )}
      {children}
    </div>
  );
}
