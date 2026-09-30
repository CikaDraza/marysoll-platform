import { describe, expect, it } from "vitest";
import {
  computeMonthlyUsageGrowth,
  type UsageHistoryPoint,
} from "./usageGrowth";

const OCT_START = new Date("2026-09-30T22:00:00Z");
const NOV_START = new Date("2026-10-31T23:00:00Z");

function point(
  iso: string,
  mongoEstimateMb: number,
  cloudinaryMb: number,
  activeStaffCount = 1,
): UsageHistoryPoint {
  return {
    capturedAt: new Date(iso),
    mongoEstimateMb,
    cloudinaryMb,
    activeStaffCount,
  };
}

describe("computeMonthlyUsageGrowth", () => {
  it("measures October from the last September close to the last October snapshot", () => {
    const growth = computeMonthlyUsageGrowth(
      [
        point("2026-10-31T22:10:00Z", 0.47, 9.1, 2),
        point("2026-09-15T22:10:00Z", 0.1, 5),
        point("2026-09-30T21:10:00Z", 0.3, 6.728),
        point("2026-10-10T22:10:00Z", 0.35, 7),
      ],
      OCT_START,
      NOV_START,
    );

    expect(growth).toEqual({
      openingAt: "2026-09-30T21:10:00.000Z",
      closingAt: "2026-10-31T22:10:00.000Z",
      openingFromPreviousMonth: true,
      closingMongoMb: 0.47,
      closingCloudinaryMb: 9.1,
      closingActiveStaffCount: 2,
      mongoDeltaMb: 0.17,
      cloudinaryDeltaMb: 2.372,
    });
  });

  it("falls back to the first October snapshot when September has none", () => {
    const growth = computeMonthlyUsageGrowth(
      [
        // 00:10 po Beogradu 1. 10. je već oktobar.
        point("2026-09-30T22:10:00Z", 0.3, 6),
        point("2026-10-20T10:00:00Z", 0.4, 5.5),
      ],
      OCT_START,
      NOV_START,
    );

    expect(growth?.openingFromPreviousMonth).toBe(false);
    expect(growth?.openingAt).toBe("2026-09-30T22:10:00.000Z");
    expect(growth?.mongoDeltaMb).toBe(0.1);
    // Brisanje medija daje negativan rast — ne sme se zaokružiti na nulu.
    expect(growth?.cloudinaryDeltaMb).toBe(-0.5);
  });

  it("reports the closing footprint but no delta for a single snapshot", () => {
    const growth = computeMonthlyUsageGrowth(
      [point("2026-10-05T10:00:00Z", 0.3, 6)],
      OCT_START,
      NOV_START,
    );

    expect(growth?.closingMongoMb).toBe(0.3);
    expect(growth?.mongoDeltaMb).toBeNull();
    expect(growth?.cloudinaryDeltaMb).toBeNull();
  });

  it("does not calculate growth across a failed provider measurement", () => {
    const points: UsageHistoryPoint[] = [
      point("2026-10-01T21:10:00Z", 1, 10),
      {
        ...point("2026-10-10T21:10:00Z", 2, 11),
        cloudinaryMb: null,
        cloudinaryComplete: false,
      },
      point("2026-10-31T21:10:00Z", 3, 12),
    ];
    const growth = computeMonthlyUsageGrowth(points, OCT_START, NOV_START);
    expect(growth?.mongoDeltaMb).toBe(2);
    expect(growth?.cloudinaryDeltaMb).toBeNull();
    expect(growth?.closingCloudinaryMb).toBe(12);
  });

  it("keeps legacy numeric history rows valid when quality flags are absent", () => {
    const growth = computeMonthlyUsageGrowth(
      [
        point("2026-10-01T21:10:00Z", 1, 10),
        point("2026-10-31T21:10:00Z", 2, 11),
      ],
      OCT_START,
      NOV_START,
    );
    expect(growth?.mongoDeltaMb).toBe(1);
    expect(growth?.cloudinaryDeltaMb).toBe(1);
  });

  it("returns null without a snapshot inside the month", () => {
    expect(
      computeMonthlyUsageGrowth(
        [
          point("2026-09-20T10:00:00Z", 0.3, 6),
          point("2026-11-02T10:00:00Z", 1, 9),
        ],
        OCT_START,
        NOV_START,
      ),
    ).toBeNull();
  });
});
