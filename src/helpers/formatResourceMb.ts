/** Human-readable MB for resource usage cards. */
export function formatResourceMb(mb: number | null | undefined): string {
  if (mb == null) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb > 0 && mb < 1) return `${Math.round(mb * 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}
