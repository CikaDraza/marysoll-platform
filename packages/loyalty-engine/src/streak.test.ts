import { describe, it, expect } from "vitest";
import { computeStreakUpdate, type StreakState } from "./streak";

const D = (iso: string) => new Date(iso);
const opts = { windowDays: 45 };
const empty: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastVisitAt: null,
};

describe("computeStreakUpdate", () => {
  it("prva poseta → streak 1, longest 1, counted", () => {
    const r = computeStreakUpdate(empty, D("2026-07-07T10:00:00Z"), opts);
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
    expect(r.counted).toBe(true);
    expect(r.reset).toBe(false);
    expect(r.lastVisitAt).toBe("2026-07-07T10:00:00.000Z");
  });

  it("nevažeći lastVisitAt → tretira se kao prva poseta", () => {
    const r = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 5, lastVisitAt: "not-a-date" },
      D("2026-07-07T10:00:00Z"),
      opts,
    );
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(5); // rekord se čuva
  });

  it("poseta unutar prozora → inkrement", () => {
    const prev: StreakState = {
      currentStreak: 3,
      longestStreak: 3,
      lastVisitAt: "2026-06-10T10:00:00Z",
    };
    const r = computeStreakUpdate(prev, D("2026-07-07T10:00:00Z"), opts); // 27 dana
    expect(r.currentStreak).toBe(4);
    expect(r.longestStreak).toBe(4);
    expect(r.counted).toBe(true);
    expect(r.reset).toBe(false);
  });

  it("razmak preko prozora → reset na 1, longest sačuvan", () => {
    const prev: StreakState = {
      currentStreak: 8,
      longestStreak: 8,
      lastVisitAt: "2026-05-01T10:00:00Z",
    };
    const r = computeStreakUpdate(prev, D("2026-07-07T10:00:00Z"), opts); // 67 dana
    expect(r.currentStreak).toBe(1);
    expect(r.reset).toBe(true);
    expect(r.longestStreak).toBe(8);
  });

  it("isti UTC dan → ne broji se (streak nepromenjen)", () => {
    const prev: StreakState = {
      currentStreak: 4,
      longestStreak: 6,
      lastVisitAt: "2026-07-07T08:00:00Z",
    };
    const r = computeStreakUpdate(prev, D("2026-07-07T20:00:00Z"), opts);
    expect(r.counted).toBe(false);
    expect(r.currentStreak).toBe(4);
    expect(r.longestStreak).toBe(6);
    expect(r.lastVisitAt).toBe("2026-07-07T20:00:00.000Z"); // osveži na kasniji
  });

  it("poseta iz prošlosti (van reda) → ne broji se, čuva lastVisitAt", () => {
    const prev: StreakState = {
      currentStreak: 4,
      longestStreak: 6,
      lastVisitAt: "2026-07-07T08:00:00Z",
    };
    const r = computeStreakUpdate(prev, D("2026-07-01T08:00:00Z"), opts);
    expect(r.counted).toBe(false);
    expect(r.currentStreak).toBe(4);
    expect(r.lastVisitAt).toBe("2026-07-07T08:00:00Z");
  });

  it("inkrement podiže longest kada ga prestigne", () => {
    const prev: StreakState = {
      currentStreak: 6,
      longestStreak: 6,
      lastVisitAt: "2026-06-20T10:00:00Z",
    };
    const r = computeStreakUpdate(prev, D("2026-07-07T10:00:00Z"), opts);
    expect(r.currentStreak).toBe(7);
    expect(r.longestStreak).toBe(7);
  });

  it("granica prozora: tačno windowDays → nastavlja; +1 dan → reset", () => {
    const base: StreakState = {
      currentStreak: 2,
      longestStreak: 2,
      lastVisitAt: "2026-01-01T00:00:00Z",
    };
    const onEdge = computeStreakUpdate(base, D("2026-02-15T00:00:00Z"), opts); // 45 dana
    expect(onEdge.currentStreak).toBe(3);
    expect(onEdge.reset).toBe(false);
    const overEdge = computeStreakUpdate(base, D("2026-02-16T00:00:00Z"), opts); // 46 dana
    expect(overEdge.currentStreak).toBe(1);
    expect(overEdge.reset).toBe(true);
  });
});
