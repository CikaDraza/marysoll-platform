// components/shared/StepContainer.tsx
"use client";

import type { ReactNode } from "react";

interface Step {
  label: string;
  completed: boolean;
  active: boolean;
}

interface Props {
  steps: Step[];
  children: ReactNode;
}

export function StepContainer({ steps, children }: Props) {
  return (
    <div>
      {/* Step progress bar */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2 shrink-0">
            <div className="p-3 flex items-center gap-1.5">
              <div
                className={[
                  "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors",
                  step.completed
                    ? "bg-violet-600 text-white"
                    : step.active
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 ring-2 ring-violet-400"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
                ].join(" ")}
              >
                {step.completed ? "✓" : idx + 1}
              </div>
              <span
                className={[
                  "p-0.5 text-xs font-medium whitespace-nowrap",
                  step.active
                    ? "text-violet-700 dark:text-violet-300"
                    : step.completed
                      ? "text-gray-600 dark:text-gray-400"
                      : "text-gray-400 dark:text-gray-600",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}
