import { describe, expect, it } from "vitest";
import { APPOINTMENT_STATUSES } from "@/types/constants";
import { RESERVATION_STATUSES } from "./contracts";
import {
  BLOCKING_RESERVATION_STATUSES,
  legacyAppointmentOccupancyPolicy,
  policyBlocksAt,
  reservationOccupancyPolicy,
  type OccupancyStatusPolicy,
} from "./occupancyStatus";
import { toOccupancies } from "./availabilityAdapter";

const LEGACY_EXPECTED: Record<string, OccupancyStatusPolicy> = {
  pending: "blocking",
  appointment_approved: "blocking",
  appointment_rescheduled: "blocking",
  appointment_rejected: "released",
  appointment_cancelled: "released",
  completed: "blocking_until_end",
  no_show: "blocking_until_end",
};

const RESERVATION_EXPECTED: Record<string, OccupancyStatusPolicy> = {
  pending: "blocking",
  confirmed: "blocking",
  released: "released",
  completed: "released",
  no_show: "released",
};

describe("occupancy status policy", () => {
  // Ako se doda status bez odluke, `Record<...>` u modulu ne kompajlira, a
  // ovaj test pada — dve nezavisne brane nad istom tabelom.
  it("ima odluku za svih 7 Appointment statusa", () => {
    expect(APPOINTMENT_STATUSES).toHaveLength(7);
    for (const status of APPOINTMENT_STATUSES) {
      expect(legacyAppointmentOccupancyPolicy(status)).toBe(LEGACY_EXPECTED[status]);
    }
  });

  it("ima odluku za svih 5 ReservationStatus vrednosti", () => {
    expect(RESERVATION_STATUSES).toHaveLength(5);
    for (const status of RESERVATION_STATUSES) {
      expect(reservationOccupancyPolicy(status)).toBe(RESERVATION_EXPECTED[status]);
    }
  });

  it("nepoznat i prazan status blokiraju na obe strane", () => {
    for (const value of ["", null, undefined, "izmisljen_status"]) {
      expect(legacyAppointmentOccupancyPolicy(value)).toBe("blocking");
      expect(reservationOccupancyPolicy(value)).toBe("blocking");
    }
  });

  it("canonical $in filter sadrži tačno pending i confirmed", () => {
    expect([...BLOCKING_RESERVATION_STATUSES].sort()).toEqual(["confirmed", "pending"]);
  });
});

describe("policyBlocksAt", () => {
  const endsAt = new Date("2026-09-01T10:00:00Z");

  it("blocking blokira bez obzira na vreme", () => {
    expect(policyBlocksAt("blocking", endsAt, new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });

  it("released nikad ne blokira", () => {
    expect(policyBlocksAt("released", endsAt, new Date("2020-01-01T00:00:00Z"))).toBe(false);
  });

  it("blocking_until_end drži interval do kraja, pa ga pušta", () => {
    expect(policyBlocksAt("blocking_until_end", endsAt, new Date("2026-09-01T09:59:00Z"))).toBe(true);
    expect(policyBlocksAt("blocking_until_end", endsAt, new Date("2026-09-01T10:00:00Z"))).toBe(false);
    expect(policyBlocksAt("blocking_until_end", endsAt, new Date("2026-09-01T10:01:00Z"))).toBe(false);
  });

  it("bez `now` blocking_until_end ostaje blokirajuće (fail-safe)", () => {
    expect(policyBlocksAt("blocking_until_end", endsAt)).toBe(true);
  });
});

describe("toOccupancies — legacy statusi", () => {
  const appt = (status: string) => ({
    date: "2026-09-01",
    time: "10:00",
    duration: 60,
    status,
  });

  it("otkazani i odbijeni ne zauzimaju", () => {
    expect(toOccupancies([appt("appointment_cancelled")], "UTC")).toHaveLength(0);
    expect(toOccupancies([appt("appointment_rejected")], "UTC")).toHaveLength(0);
  });

  it("pending, approved i rescheduled zauzimaju", () => {
    for (const status of ["pending", "appointment_approved", "appointment_rescheduled"]) {
      expect(toOccupancies([appt(status)], "UTC")).toHaveLength(1);
    }
  });

  /**
   * Regresija za kasni otkaz: `cancelAppointmentAsClient` postavlja `no_show`
   * u trenutku otkaza, dakle PRE kraja termina. Da je `no_show` sveden na
   * običan non-blocking status, taj interval bi se odmah oslobodio i mogao bi
   * biti dvostruko zakazan.
   */
  it("no_show na terminu koji još traje i dalje blokira", () => {
    const duringAppointment = new Date("2026-09-01T10:30:00Z");
    expect(toOccupancies([appt("no_show")], "UTC", duringAppointment)).toHaveLength(1);

    const beforeAppointment = new Date("2026-09-01T08:00:00Z");
    expect(toOccupancies([appt("no_show")], "UTC", beforeAppointment)).toHaveLength(1);
  });

  it("no_show posle kraja termina više ne blokira", () => {
    const afterAppointment = new Date("2026-09-01T11:30:00Z");
    expect(toOccupancies([appt("no_show")], "UTC", afterAppointment)).toHaveLength(0);
    expect(toOccupancies([appt("completed")], "UTC", afterAppointment)).toHaveLength(0);
  });

  it("bez `now` legacy no_show/completed blokiraju — zatečeno ponašanje", () => {
    expect(toOccupancies([appt("no_show")], "UTC")).toHaveLength(1);
    expect(toOccupancies([appt("completed")], "UTC")).toHaveLength(1);
  });
});
