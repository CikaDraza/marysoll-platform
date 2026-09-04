"use client";

import { useState, type ReactNode } from "react";

export function ClientOverviewSection({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(open);

  return (
    <details open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <summary className="cursor-pointer select-none px-5 py-4 font-bold text-gray-900 dark:text-gray-100">{title}</summary>
      <div className="border-t border-gray-100 p-5 dark:border-gray-800">{children}</div>
    </details>
  );
}
