"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface PasswordVisibilityButtonProps {
  visible: boolean;
  onToggle: () => void;
  className?: string;
}

/** Zajedničko, pristupačno dugme za prikaz/sakrivanje vrednosti lozinke. */
export function PasswordVisibilityButton({
  visible,
  onToggle,
  className = "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200",
}: PasswordVisibilityButtonProps) {
  const label = visible ? "Sakrij lozinku" : "Prikaži lozinku";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      aria-pressed={visible}
      className={`absolute inset-y-0 right-0 flex w-11 items-center justify-center transition ${className}`}
    >
      {visible ? (
        <EyeSlashIcon className="size-5" aria-hidden="true" />
      ) : (
        <EyeIcon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
