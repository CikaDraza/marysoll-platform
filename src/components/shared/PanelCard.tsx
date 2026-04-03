// components/shared/PanelCard.tsx
"use client";

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export function PanelCard({ children, className = "" }: Props) {
  return (
    <div
      className={[
        "bg-white dark:bg-gray-900",
        "rounded-2xl border border-gray-200 dark:border-gray-800",
        "shadow-sm p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
