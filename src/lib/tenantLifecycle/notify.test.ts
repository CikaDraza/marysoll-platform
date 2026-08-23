import { describe, expect, it } from "vitest";
import { APPOINTMENT_STATUSES } from "@/types/constants";

/**
 * Ugovorni testovi za obaveštenja o životnom ciklusu salona.
 *
 * Slanje samo po sebi traži bazu, push pretplate i mejl servis, pa se ovde
 * proverava ono što tiho puca u produkciji: da su novi `Notification.type`
 * vrednosti stvarno u mongoose enum-u. Polje van enum-a `strict` shema tiho
 * odbaci — isti obrazac koji je progutao `landing.stats`.
 */
async function notificationEnum(): Promise<string[]> {
  const { Notification } = await import("@/models/Notification");
  const path = Notification.schema.path("type") as unknown as {
    enumValues?: string[];
  };
  return path.enumValues ?? [];
}

describe("Notification.type enum", () => {
  it("poznaje tipove koje šalje životni ciklus salona", async () => {
    const values = await notificationEnum();
    expect(values).toContain("tenant_registered");
    expect(values).toContain("tenant_activated");
  });

  it("i dalje poznaje chat_message — kanal aktivacije ide kroz njega", async () => {
    expect(await notificationEnum()).toContain("chat_message");
  });

  it("nijedan Appointment status nije slučajno upao u tipove notifikacija", async () => {
    const values = await notificationEnum();
    // `pending` / `completed` / `no_show` su statusi termina, ne tipovi
    // obaveštenja — ako se pojave ovde, neko je pomešao dva enum-a.
    for (const s of ["pending", "completed", "no_show"] as const) {
      expect(APPOINTMENT_STATUSES).toContain(s);
      expect(values).not.toContain(s);
    }
  });
});
