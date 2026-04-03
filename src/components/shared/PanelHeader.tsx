// components/shared/PanelHeader.tsx
"use client";

interface Props {
  title: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
}

export function PanelHeader({ title, description, badge, badgeColor }: Props) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-bold text-gray-800 dark:text-white">
          {title}
        </h3>
        {badge && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColor ?? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"}`}
          >
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
