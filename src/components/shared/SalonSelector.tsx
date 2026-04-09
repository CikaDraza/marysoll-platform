// components/shared/SalonSelector.tsx
// Multi-select salon picker. No auto-selection — admin must explicitly choose.
"use client";

import { useTenantSalons } from "@/hooks/useTenantSalons";

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Show validation error state */
  showError?: boolean;
}

export function SalonSelector({ value, onChange, showError }: Props) {
  const { data: salons, isLoading, isError } = useTenantSalons();

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((s) => s !== id));
    } else {
      onChange([...value, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1].map((i) => (
          <div
            key={i}
            className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-500 dark:text-red-400">
        Greška pri učitavanju salona. Osvežite stranicu.
      </p>
    );
  }

  if (!salons || salons.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
        Nema salona za ovaj tenant.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {salons.map((salon) => {
        const selected = value.includes(salon._id);
        return (
          <button
            key={salon._id}
            type="button"
            onClick={() => toggle(salon._id)}
            className={[
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition cursor-pointer",
              selected
                ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-600"
                : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700",
            ].join(" ")}
          >
            {/* Checkbox indicator */}
            <div
              className={[
                "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                selected
                  ? "border-violet-600 bg-violet-600"
                  : "border-gray-300 dark:border-gray-600",
              ].join(" ")}
            >
              {selected && (
                <svg
                  className="w-3 h-3 text-white"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            <div className="min-w-0">
              <p
                className={[
                  "text-sm font-medium truncate",
                  selected
                    ? "text-violet-700 dark:text-violet-300"
                    : "text-gray-800 dark:text-gray-200",
                ].join(" ")}
              >
                {salon.name}
              </p>
              {salon.city && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {salon.city}
                </p>
              )}
            </div>
          </button>
        );
      })}

      {showError && value.length === 0 && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
          Izaberite najmanje jedan salon.
        </p>
      )}
    </div>
  );
}
