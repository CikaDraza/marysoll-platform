import { normalizePhone } from "@/helpers/normalizePhone";

// Pure heuristika detekcije duplikata (Phase 4b). Grupiše klijentske naloge po
// NORMALIZOVANOM telefonu; vraća samo grupe sa ≥2 naloga i bar jednim GOSTOM
// (email je unique po tenantu → ne može duplo, pa je telefon jedini realan ključ).
// Bez DB — testabilno; ruta enrich-uje rezultat loyalty/termin sažetkom.

export interface DuplicateCandidate {
  role: string;
  phone?: string;
}

export function groupDuplicatesByPhone<T extends DuplicateCandidate>(
  users: T[],
): Array<{ key: string; accounts: T[] }> {
  const byPhone = new Map<string, T[]>();
  for (const u of users) {
    const key = normalizePhone(u.phone ?? "");
    if (!key) continue; // prazan/nevalidan telefon se preskače
    const arr = byPhone.get(key) ?? [];
    arr.push(u);
    byPhone.set(key, arr);
  }
  return [...byPhone.entries()]
    .filter(([, arr]) => arr.length >= 2 && arr.some((u) => u.role === "GUEST"))
    .map(([key, accounts]) => ({ key, accounts }));
}
