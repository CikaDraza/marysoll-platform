/**
 * Otkazan termin mora ODMAH osloboditi slot — ali ne sme nestati iz baze.
 *
 * Pravilo je bilo prepisano na sedam mesta kao
 * `$nin: ["appointment_rejected", "appointment_cancelled"]`, pa je `no_show`
 * ostajao blokirajući. Klijentkinja kasno otkaže u 13:30 za termin u 14:00,
 * termin pređe u `no_show` + `late_cancel`, a salon taj slot više ne može da
 * proda jer ga sistem i dalje smatra zauzetim.
 *
 * Istorija je potrebna statistici, loyalty-ju, brojaču nedolazaka i budućem
 * Restriction Engine-u — zato se termin ne briše, samo prestaje da drži vreme.
 */
import { describe, it, expect } from "vitest";
import {
  blocksSlot,
  ACTIVE_APPOINTMENT_STATUS_FILTER,
  BLOCKING_APPOINTMENT_STATUSES,
  NON_BLOCKING_APPOINTMENT_STATUSES,
} from "./occupancy";
import { overlapsAppointments } from "@/helpers/manualSlots";
import { availableTimesForDate } from "@/lib/booking/availabilityAdapter";

describe("blocksSlot", () => {
  it("aktivni termini drže vreme", () => {
    for (const status of [
      "pending",
      "appointment_approved",
      "appointment_rescheduled",
    ]) {
      expect(blocksSlot(status)).toBe(true);
    }
  });

  it("REGRESIJA: no_show NE drži vreme", () => {
    expect(blocksSlot("no_show")).toBe(false);
  });

  it("otkazan, odbijen i završen ne drže vreme", () => {
    for (const status of [
      "appointment_cancelled",
      "appointment_rejected",
      "completed",
    ]) {
      expect(blocksSlot(status)).toBe(false);
    }
  });

  it("Mongo filter isključuje tačno te statuse", () => {
    expect(ACTIVE_APPOINTMENT_STATUS_FILTER.$nin).toEqual([
      ...NON_BLOCKING_APPOINTMENT_STATUSES,
    ]);
    expect(ACTIVE_APPOINTMENT_STATUS_FILTER.$nin).toContain("no_show");
  });
});

describe("kasno otkazivanje oslobađa slot", () => {
  const DAY = "2026-09-12"; // subota
  const workingHours = { Subota: [{ from: "09:00", to: "20:00" }] };
  const NOW = new Date("2026-09-01T08:00:00Z");

  /** Isti filter koji rade rute: u proveru ulaze samo blokirajući termini. */
  function activeOnly(
    appts: { date: string; time: string; duration: number; status: string }[],
  ) {
    return appts.filter((a) => blocksSlot(a.status));
  }

  const appointment = {
    date: DAY,
    time: "14:00",
    duration: 60,
    status: "appointment_approved",
  };

  it("1–2: aktivan termin drži 14:00", () => {
    const active = activeOnly([appointment]);
    expect(overlapsAppointments(active, DAY, "14:00", 60)).toBe(true);
    expect(
      availableTimesForDate({
        tenantId: "t",
        localDate: DAY,
        durationMinutes: 60,
        profile: { workingHours },
        appointments: active,
        now: NOW,
      }),
    ).not.toContain("14:00");
  });

  it("3–6: posle kasnog otkazivanja 14:00 je odmah slobodan", () => {
    // Klijentkinja otkazuje van roka → canonical ishod.
    const lateCancelled = {
      ...appointment,
      status: "no_show",
      noShowReason: "late_cancel",
    };

    // 4. termin OSTAJE u bazi kao no_show + late_cancel
    expect(lateCancelled.status).toBe("no_show");
    expect(lateCancelled.noShowReason).toBe("late_cancel");

    // 5. ali više ne drži vreme
    const active = activeOnly([lateCancelled]);
    expect(active).toHaveLength(0);
    expect(overlapsAppointments(active, DAY, "14:00", 60)).toBe(false);

    // 6. i drugi klijent ga vidi kao slobodan
    expect(
      availableTimesForDate({
        tenantId: "t",
        localDate: DAY,
        durationMinutes: 60,
        profile: { workingHours },
        appointments: active,
        now: NOW,
      }),
    ).toContain("14:00");
  });

  it("regularno otkazivanje isto oslobađa slot", () => {
    const cancelled = { ...appointment, status: "appointment_cancelled" };
    expect(activeOnly([cancelled])).toHaveLength(0);
  });

  it("tuđi AKTIVAN termin i dalje blokira", () => {
    const other = { ...appointment, status: "pending" };
    expect(overlapsAppointments(activeOnly([other]), DAY, "14:00", 60)).toBe(
      true,
    );
  });
});

describe("javni feed zauzeća prati canonical pravilo", () => {
  const DAY = "2026-09-12";
  const workingHours = { Subota: [{ from: "09:00", to: "20:00" }] };
  const NOW = new Date("2026-09-01T08:00:00Z");

  it("REGRESIJA: appointment_rescheduled JE zauzeće", () => {
    // Javni feed je ranije imao ručnu listu ["appointment_approved","pending"],
    // pa je pomeren termin izgledao slobodno u UI-ju iako ga server blokira —
    // klijent bi popunio formu i tek na potvrdi dobio „Termin je zauzet".
    expect(BLOCKING_APPOINTMENT_STATUSES).toContain("appointment_rescheduled");
    expect(blocksSlot("appointment_rescheduled")).toBe(true);
  });

  it("allow-lista sadrži tačno aktivne statuse", () => {
    expect([...BLOCKING_APPOINTMENT_STATUSES].sort()).toEqual(
      ["appointment_approved", "appointment_rescheduled", "pending"].sort(),
    );
  });

  it("otkazani, propušteni i završeni NISU u javnom feedu", () => {
    for (const status of [
      "appointment_cancelled",
      "appointment_rejected",
      "no_show",
      "completed",
    ]) {
      expect(BLOCKING_APPOINTMENT_STATUSES).not.toContain(status);
    }
  });

  it("pomeren termin u 14:00 ne nudi 14:00 klijentu", () => {
    const rescheduled = {
      date: DAY,
      time: "14:00",
      duration: 60,
      status: "appointment_rescheduled",
    };
    const active = [rescheduled].filter((a) => blocksSlot(a.status));
    expect(active).toHaveLength(1);
    expect(
      availableTimesForDate({
        tenantId: "t",
        localDate: DAY,
        durationMinutes: 60,
        profile: { workingHours },
        appointments: active,
        now: NOW,
      }),
    ).not.toContain("14:00");
    // Server bi ga odbio i da zahtev stigne mimo UI-ja.
    expect(overlapsAppointments(active, DAY, "14:00", 60)).toBe(true);
  });
});
