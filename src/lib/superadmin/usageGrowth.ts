/**
 * Mesečni rast potrošnje iz append-only TenantUsageHistory — čista funkcija.
 *
 * Početak meseca = poslednji snimak PRE početka meseca (kraj prethodnog
 * meseca); ako ga nema, prvi snimak unutar meseca. Kraj = poslednji snimak
 * unutar meseca. Jedan jedini snimak ne daje rast (delta je null).
 */
import type { SalonUsageGrowth } from "@/types/superadmin-statistics";

export interface UsageHistoryPoint {
  capturedAt: Date;
  mongoEstimateMb: number;
  cloudinaryMb: number;
  activeStaffCount: number;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

export function computeMonthlyUsageGrowth(
  points: UsageHistoryPoint[],
  monthStart: Date,
  monthEnd: Date,
): SalonUsageGrowth | null {
  const sorted = [...points].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );
  const inMonth = sorted.filter(
    (p) => p.capturedAt >= monthStart && p.capturedAt < monthEnd,
  );
  if (inMonth.length === 0) return null;

  const before = sorted.filter((p) => p.capturedAt < monthStart);
  const opening = before.at(-1) ?? inMonth[0];
  const closing = inMonth.at(-1)!;
  const hasWindow = opening !== closing;

  return {
    openingAt: opening.capturedAt.toISOString(),
    closingAt: closing.capturedAt.toISOString(),
    openingFromPreviousMonth: before.length > 0,
    closingMongoMb: closing.mongoEstimateMb,
    closingCloudinaryMb: closing.cloudinaryMb,
    closingActiveStaffCount: closing.activeStaffCount,
    mongoDeltaMb: hasWindow
      ? round3(closing.mongoEstimateMb - opening.mongoEstimateMb)
      : null,
    cloudinaryDeltaMb: hasWindow
      ? round3(closing.cloudinaryMb - opening.cloudinaryMb)
      : null,
  };
}
