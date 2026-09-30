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
  mongoEstimateMb: number | null;
  mongoEstimateComplete?: boolean;
  cloudinaryMb: number | null;
  cloudinaryComplete?: boolean;
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

  const complete = (value: number | null, flag: boolean | undefined) =>
    value != null && Number.isFinite(value) && flag !== false;
  const windowPoints = sorted.filter(
    (point) =>
      point.capturedAt >= opening.capturedAt &&
      point.capturedAt <= closing.capturedAt,
  );
  const mongoWindowComplete = windowPoints.every((point) =>
    complete(point.mongoEstimateMb, point.mongoEstimateComplete),
  );
  const cloudWindowComplete = windowPoints.every((point) =>
    complete(point.cloudinaryMb, point.cloudinaryComplete),
  );

  return {
    openingAt: opening.capturedAt.toISOString(),
    closingAt: closing.capturedAt.toISOString(),
    openingFromPreviousMonth: before.length > 0,
    closingMongoMb: complete(
      closing.mongoEstimateMb,
      closing.mongoEstimateComplete,
    )
      ? closing.mongoEstimateMb
      : null,
    closingCloudinaryMb: complete(
      closing.cloudinaryMb,
      closing.cloudinaryComplete,
    )
      ? closing.cloudinaryMb
      : null,
    closingActiveStaffCount: closing.activeStaffCount,
    mongoDeltaMb:
      hasWindow && mongoWindowComplete
        ? round3(closing.mongoEstimateMb! - opening.mongoEstimateMb!)
        : null,
    cloudinaryDeltaMb:
      hasWindow && cloudWindowComplete
        ? round3(closing.cloudinaryMb! - opening.cloudinaryMb!)
        : null,
  };
}
