import { describe, expect, it } from "vitest";
import {
  computeClientPeriodInsights,
  statisticsPeriod,
  topClientsForPeriod,
  type StatisticsAppointment,
} from "./engine";

function appointment(overrides: Partial<StatisticsAppointment> = {}): StatisticsAppointment {
  return {
    clientProfileId: "client-1",
    clientName: "Marija",
    clientEmail: "m@example.com",
    date: "2026-09-02",
    time: "10:00",
    status: "pending",
    pricing: {
      mode: "fixed", currency: "RSD", baseAmount: 2000, minimumTotal: 2000,
      knownAddonsTotal: 0, quotedBaseAmount: null, quotedTotal: null,
      chargedAmount: null, lines: [],
    },
    ...overrides,
  };
}

describe("shared Statistics Engine", () => {
  it("preserves local salon month/year boundaries", () => {
    const { start, end } = statisticsPeriod(9, 2026);
    expect(start).toEqual(new Date(2026, 8, 1));
    expect(end).toEqual(new Date(2026, 9, 1));
  });

  it("keeps unknown price null and separate from zero", () => {
    const stats = computeClientPeriodInsights([
      appointment({ pricing: undefined, services: [{ price: 0, quantity: 1 }] }),
    ]);
    expect(stats.potential).toBe(0);
    expect(stats.realized).toBe(0);
    expect(stats.withoutPrice).toBe(1);
  });

  it("uses canonical potential/realized accessors and status counts", () => {
    const stats = computeClientPeriodInsights([
      appointment(),
      appointment({ status: "completed", pricing: { ...appointment().pricing!, chargedAmount: 2500 } }),
      appointment({ status: "appointment_cancelled" }),
      appointment({ status: "no_show" }),
    ]);
    expect(stats).toMatchObject({ potential: 8000, realized: 2500, total: 4, completed: 1, cancelled: 1, noShow: 1 });
  });

  it("identifies Top 3 by clientProfileId, with email only as legacy fallback", () => {
    const top = topClientsForPeriod([
      appointment(), appointment(),
      appointment({ clientProfileId: "client-2", clientEmail: "m@example.com" }),
    ]);
    expect(top[0]).toMatchObject({ clientId: "client-1", count: 2 });
    expect(top[1]).toMatchObject({ clientId: "client-2", count: 1 });
  });
});
