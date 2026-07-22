/**
 * Čista klasifikaciona logika integrity kolektora — bez Mongo/server-only,
 * testabilna fixtures-ima (root vitest). Kolektori rade upite i hrane ove
 * funkcije lean redovima; kontrakt (findings/rezultati) živi u
 * @panta/diagnostic-engine/integrity.
 */

/** Normalizovan red korisnika (id-jevi već stringovi — loaders to garantuje). */
export interface UserIndexRow {
  _id: string;
  role: string;
  status: string;
  mergedInto: string | null;
  phone?: string;
  name?: string;
}

export type UserIndex = Map<string, UserIndexRow>;

export function buildUserIndex(rows: readonly UserIndexRow[]): UserIndex {
  const index: UserIndex = new Map();
  for (const row of rows) index.set(row._id, row);
  return index;
}

/**
 * Problem sa referencom na korisnika; null = referenca zdrava.
 * "merged" ima prednost nad "suspended" (spojen nalog je uvek i suspendovan —
 * merge soft-delete postavlja oba).
 */
export type UserRefIssue = "missing" | "merged" | "suspended";

export function classifyUserRef(
  id: string,
  index: UserIndex,
): UserRefIssue | null {
  const user = index.get(id);
  if (!user) return "missing";
  if (user.mergedInto) return "merged";
  if (user.status === "suspended") return "suspended";
  return null;
}

/** Ljudski opis problema reference — za message nalaza. */
export function refIssueLabel(issue: UserRefIssue): string {
  switch (issue) {
    case "missing":
      return "nalog ne postoji u ovom salonu (obrisan ili pogrešan tenant)";
    case "merged":
      return "nalog je spojen u drugi (mergedInto)";
    case "suspended":
      return "nalog je suspendovan";
  }
}

/**
 * Aktivan klijentski nalog: USER/GUEST, nije suspendovan i nije spojen.
 * (Za orphans INFO stranu: aktivan klijent bez loyalty naloga.)
 */
export function isActiveClient(user: UserIndexRow): boolean {
  return (
    (user.role === "USER" || user.role === "GUEST") &&
    user.status !== "suspended" &&
    !user.mergedInto
  );
}

/** Minimalan ledger red za grupisanje po nalogu (iznosi signed). */
export interface LedgerRowLike {
  accountId: string;
  currency: string;
  amount: number;
}

/** Grupisanje ledger redova po accountId — ulaz za expectedBalancesFromLedger. */
export function groupLedgerByAccount<T extends LedgerRowLike>(
  rows: readonly T[],
): Map<string, T[]> {
  const byAccount = new Map<string, T[]>();
  for (const row of rows) {
    const arr = byAccount.get(row.accountId) ?? [];
    arr.push(row);
    byAccount.set(row.accountId, arr);
  }
  return byAccount;
}

/** Broji pojave po ključu — za "koliko referenci po modelu" evidence. */
export function countOccurrences(keys: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}
