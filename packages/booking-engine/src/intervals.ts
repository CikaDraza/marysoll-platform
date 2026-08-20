/**
 * Minutni intervali `[start, end)` unutar jednog dana.
 *
 * Half-open je ovde ODLUKA, ne detalj: termin koji počinje tačno kada se
 * prethodni završava je dozvoljen. Zatečeni widget je zauzetost proveravao
 * samo nad POČETKOM kandidata (`slotMin >= start && slotMin < end`), pa je
 * 60-minutni termin u 11:30 prolazio pored zauzetog termina u 12:00.
 */

export interface MinuteInterval {
  start: number;
  end: number;
}

/** Sortira, odbacuje prazne i spaja intervale koji se dodiruju ili preklapaju. */
export function normalize(intervals: MinuteInterval[]): MinuteInterval[] {
  const valid = intervals
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: MinuteInterval[] = [];
  for (const interval of valid) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/** Half-open presek: dodirivanje na granici NIJE preklapanje. */
export function overlaps(a: MinuteInterval, b: MinuteInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * `from` minus `cuts` — ovim pauze i odmori seku raspored.
 *
 * Ovde nestaje zatečeni bug: stari `getWorkingRange()` je uzimao min(from) i
 * max(to) preko svih opsega dana, pa je pauza 12–13 iščezavala i widget je
 * nudio termine usred nje. Rez se sada radi nad intervalima, ne nad krajevima.
 */
export function subtract(
  from: MinuteInterval[],
  cuts: MinuteInterval[],
): MinuteInterval[] {
  const open = normalize(from);
  const closed = normalize(cuts);
  if (!closed.length) return open;

  const result: MinuteInterval[] = [];
  for (const interval of open) {
    let pieces: MinuteInterval[] = [interval];
    for (const cut of closed) {
      const next: MinuteInterval[] = [];
      for (const piece of pieces) {
        if (!overlaps(piece, cut)) {
          next.push(piece);
          continue;
        }
        if (cut.start > piece.start) next.push({ start: piece.start, end: cut.start });
        if (cut.end < piece.end) next.push({ start: cut.end, end: piece.end });
      }
      pieces = next;
    }
    result.push(...pieces);
  }
  return normalize(result);
}
