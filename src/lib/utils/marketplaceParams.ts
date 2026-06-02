/**
 * Resolves the salon `limit` query param for /marketplace/salons.
 * Default 5 (homepage showcase). AI/platform-knowledge passes a higher value.
 * Clamped to [1, 200].
 */
export function resolveSalonLimit(param: string | null): number {
  const n = Number(param);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(Math.trunc(n), 200);
}
