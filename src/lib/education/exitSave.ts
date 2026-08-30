/**
 * Čuvanje radne kopije pri napuštanju strane.
 *
 * Obična `fetch`/axios veza se prekida čim se dokument gasi, pa se koristi
 * `keepalive`: pregledač je pušta da se dovrši i posle zatvaranja kartice.
 * Zato ovaj put NE ide kroz `api` instancu — njoj interceptor ne bi pomogao,
 * a odgovor ionako nema ko da pročita.
 *
 * Namerno ne kreira nove zapise: bez `id`-a nema šta da se dopuni, a slanje
 * „na slepo" pri gašenju strane je najgori trenutak za pravljenje zapisa.
 */
export function saveEducationDraftOnExit(
  id: string,
  payload: Record<string, unknown>,
): boolean {
  if (typeof window === "undefined") return false;
  if (Object.keys(payload).length === 0) return false;

  const token = window.localStorage.getItem("token");
  if (!token) return false;

  try {
    void fetch(`/api/education/content/${id}`, {
      method: "PATCH",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    // Gašenje strane ne sme da pukne zbog čuvanja; izmene ostaju nesačuvane,
    // ali ništa gore od toga se ne dešava.
    return false;
  }
}
