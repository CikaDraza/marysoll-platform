// components/shared/ErrorState.tsx
"use client";

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Greška pri generisanju.",
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-xl">
        ⚠️
      </div>
      <p className="text-sm text-red-600 dark:text-red-400 text-center max-w-xs">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-violet-600 hover:text-violet-800 underline underline-offset-2 transition"
        >
          Pokušaj ponovo
        </button>
      )}
    </div>
  );
}
