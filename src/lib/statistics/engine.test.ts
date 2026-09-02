import { describe, expect, it } from "vitest";
import {
  computeClientPeriodInsights,
  computeSalonStatistics,
  futureActivePotential,
  relationshipRealizedRevenue,
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

  it("counts only future active appointments as relationship potential", () => {
    const now = new Date(2026, 8, 2, 9, 0);
    const future = { date: "2026-09-03", time: "10:00" };
    const appointments = [
      appointment({ ...future, status: "pending" }),
      appointment({ ...future, status: "completed" }),
      appointment({ ...future, status: "appointment_cancelled" }),
      appointment({ ...future, status: "appointment_rejected" }),
      appointment({ ...future, status: "no_show" }),
    ];
    expect(futureActivePotential(appointments, now)).toBe(2000);
  });

  it("sums canonical realized revenue across history", () => {
    expect(relationshipRealizedRevenue([
      appointment({ date: "2025-01-01", status: "completed" }),
      appointment({ date: "2025-02-01", status: "pending" }),
    ])).toBe(2000);
  });

  it("builds the salon response from projected appointments and aggregate client counts", () => {
    const appointments = [
      appointment({ services: [{ serviceId: { name: "Nokti" }, price: 2000, quantity: 1 }] }),
      appointment({ status: "completed", services: [{ serviceId: { name: "Nokti" }, price: 2000, quantity: 1 }] }),
    ];
    const stats = computeSalonStatistics({
      appointments,
      month: 9,
      year: 2026,
      totalClients: 4,
      registeredThisMonth: 1,
      firstEverByEmail: [{ email: "m@example.com", firstCreatedAt: new Date(2026, 8, 2) }],
    });
    expect(stats).toMatchObject({
      totalAppointments: 2,
      totalRevenue: 4000,
      revenue: { potential: 4000, completed: 2000, completedCount: 1 },
      clients: { total: 4, active: 1, inactive: 3, new: 1, returning: 0, registeredThisMonth: 1 },
      topServices: [{ service: "Nokti", count: 2 }],
    });
  });
});
