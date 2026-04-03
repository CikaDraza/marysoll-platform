// components/shared/LoadingState.tsx
"use client";

interface Props {
  message?: string;
}

export function LoadingState({ message = "Generišem..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-violet-100 dark:border-violet-900/30" />
        <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
        {message}
      </p>
    </div>
  );
}
