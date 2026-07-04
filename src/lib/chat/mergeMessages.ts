/**
 * Stabilan merge chat poruka — čuva reference nepromenjenih objekata da
 * React.memo preskoči re-render bubble-ova. Deljen između useAdminChat i
 * useSuperAdminChat: logika je suptilna (fast-path na poslednji ID + broj,
 * očuvanje "temp-" poruka do potvrde servera), pa NE sme da živi u dve kopije.
 *
 * `contentUnchanged` apstrahuje jedino što se razlikuje između hookova —
 * polje teksta poruke (admin: `content`, superadmin: `message`).
 */
export interface MergeableMessage {
  _id: string;
  isDeleted: boolean;
}

export function mergeChatMessages<T extends MergeableMessage>(
  prev: T[],
  incoming: T[],
  contentUnchanged: (existing: T, next: T) => boolean,
): T[] {
  const realPrev = prev.filter((m) => !m._id.startsWith("temp-"));

  // Fast path: poslednji stabilni ID i ukupan broj nepromenjeni → nema novog
  if (
    realPrev.length === incoming.length &&
    (incoming.length === 0 ||
      realPrev[realPrev.length - 1]._id === incoming[incoming.length - 1]._id)
  ) {
    return prev; // ista referenca → React preskače re-render
  }

  const prevById = new Map(prev.map((m) => [m._id, m]));

  const merged = incoming.map((m) => {
    const existing = prevById.get(m._id);
    if (
      existing &&
      existing.isDeleted === m.isDeleted &&
      contentUnchanged(existing, m)
    ) {
      return existing; // isti objekat → React.memo bail-out
    }
    return m;
  });

  // Sačuvaj temp poruke koje server još nije potvrdio
  const incomingIds = new Set(incoming.map((m) => m._id));
  const temps = prev.filter(
    (m) => m._id.startsWith("temp-") && !incomingIds.has(m._id),
  );

  return temps.length > 0 ? [...merged, ...temps] : merged;
}
