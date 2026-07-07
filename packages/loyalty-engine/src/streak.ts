// Streak = NAVIKA (ne valuta): koliko uzastopnih poseta klijent drži unutar
// prozora. Za razliku od naivnog brojača, ovde razmak > prozor RESETUJE streak,
// a `longestStreak` pamti rekord. Čista, deterministička funkcija (bez baze).
//
// Poređenje po UTC danu (day number od epohe): dve posete istog UTC dana su
// "isti dan" (ne broje se dvaput); razlika u danima je razmak. App sloj i dalje
// gejtuje "jedan check-in dnevno", ovo je sekundarni osigurač.

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  /** ISO timestamp poslednje BROJANE posete, ili null (nema istorije). */
  lastVisitAt: string | null;
}

export interface StreakUpdateOptions {
  /** Maks. razmak (dana) da se streak nastavi; preko toga → reset na 1. */
  windowDays: number;
}

export interface StreakUpdateResult extends StreakState {
  /** true = poseta je brojana (nov dan); false = isti/raniji dan (no-op). */
  counted: boolean;
  /** true = streak resetovan zbog razmaka preko prozora. */
  reset: boolean;
}

const DAY_MS = 86_400_000;
const utcDayNumber = (ms: number): number => Math.floor(ms / DAY_MS);

/** Prva (ili nevažeća istorija) poseta — streak kreće od 1. */
function firstVisit(visitIso: string, longestPrev: number): StreakUpdateResult {
  return {
    currentStreak: 1,
    longestStreak: Math.max(1, longestPrev),
    lastVisitAt: visitIso,
    counted: true,
    reset: false,
  };
}

export function computeStreakUpdate(
  prev: StreakState,
  visitAt: Date,
  options: StreakUpdateOptions,
): StreakUpdateResult {
  const visitMs = visitAt.getTime();
  const visitIso = new Date(visitMs).toISOString();
  const longestPrev = Math.max(0, prev.longestStreak || 0);

  if (!prev.lastVisitAt) return firstVisit(visitIso, longestPrev);
  const lastMs = new Date(prev.lastVisitAt).getTime();
  if (Number.isNaN(lastMs)) return firstVisit(visitIso, longestPrev);

  const gapDays = utcDayNumber(visitMs) - utcDayNumber(lastMs);
  const currentPrev = Math.max(1, prev.currentStreak || 1);

  // Isti UTC dan (ili poseta iz prošlosti van reda) → ne broji se.
  if (gapDays <= 0) {
    return {
      currentStreak: currentPrev,
      longestStreak: Math.max(longestPrev, currentPrev),
      lastVisitAt: visitMs >= lastMs ? visitIso : prev.lastVisitAt,
      counted: false,
      reset: false,
    };
  }

  const withinWindow = gapDays <= options.windowDays;
  const currentStreak = withinWindow ? currentPrev + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(longestPrev, currentStreak),
    lastVisitAt: visitIso,
    counted: true,
    reset: !withinWindow,
  };
}
