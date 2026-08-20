"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface PasswordVisibilityButtonProps {
  visible: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Browser password manageri ponekad završe autofill tek na prvom kliku i
 * ponovo nametnu `type=password` posle React rendera. Zato menjamo i stvarni
 * susedni input sinhrono, a React state ostaje deklarativni izvor istine.
 */
export function applyPasswordVisibility(
  container: ParentNode | null,
  visible: boolean,
): void {
  const input = container?.querySelector<HTMLInputElement>("input");
  if (input) input.type = visible ? "text" : "password";
}

/** Zajedničko, pristupačno dugme za prikaz/sakrivanje vrednosti lozinke. */
export function PasswordVisibilityButton({
  visible,
  onToggle,
  className = "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200",
}: PasswordVisibilityButtonProps) {
  const label = visible ? "Sakrij lozinku" : "Prikaži lozinku";

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextVisible = !visible;
    const container = event.currentTarget.parentElement;

    applyPasswordVisibility(container, nextVisible);
    onToggle();

    // Re-assert posle autofill mikro-ciklusa (Chrome/Edge/Safari password
    // manager može da prepiše `type` nakon prvog korisničkog gesta).
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() =>
        applyPasswordVisibility(container, nextVisible),
      );
    }
  };

  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={handleClick}
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
