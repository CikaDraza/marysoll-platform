// Format valute loyalty programa (srpska deklinacija). Čista funkcija.
// Preseljeno iz marysoll src/lib/loyalty/types.ts (Phase 0) — ponašanje isto.

export interface CurrencyNames {
  enabled: boolean;
  nameOne: string;
  nameFew: string;
  nameMany: string;
  emoji: string;
}

/** Srpska deklinacija broja uz naziv valute: 1 srce / 2 srca / 5 srca. */
export function formatCurrencyAmount(
  n: number,
  names: Pick<CurrencyNames, "nameOne" | "nameFew" | "nameMany">,
): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  let word = names.nameMany;
  if (mod10 === 1 && mod100 !== 11) word = names.nameOne;
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    word = names.nameFew;
  return `${n} ${word}`;
}
