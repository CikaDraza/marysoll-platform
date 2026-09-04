/**
 * Klijent sme da vidi ISKLJUČIVO svoje termine.
 *
 * `/api/appointments` je do sada filtrirao `clientProfileId` samo ako ga je
 * POZIVALAC poslao kao query parametar. Klijent koji ga izostavi dobijao je
 * pune termine celog salona — ime, email, telefon, Instagram, napomenu,
 * poruke, intake fotografije i cene drugih klijenata.
 *
 * `requireCapability` tu ne pomaže: on proverava šta TENANT sme, ne šta
 * konkretan korisnik sme nad tuđim zapisom.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/api/appointments/route.ts", "utf8");

describe("izolacija klijenta u /api/appointments", () => {
  it("klijentski poziv se filtrira po tokenu, ne po query parametru", () => {
    expect(source).toMatch(
      /filter\.clientProfileId = new Types\.ObjectId\(decoded\.tenantUserId\)/,
    );
  });

  it("klijent bez `tenantUserId` dobija 403, ne praznu listu", () => {
    expect(source).toMatch(/Forbidden: no client context/);
  });

  it("REGRESIJA: `clientId` iz query-ja važi SAMO za admina", () => {
    // Grana iz query parametra mora biti `else if` — inače bi klijent mogao
    // da je pregazi slanjem tuđeg id-a.
    expect(source).toMatch(
      /filter\.clientProfileId = new Types\.ObjectId\(decoded\.tenantUserId\);\s*\}\s*else if \(clientId\)/,
    );
  });

  it("tenant scope ostaje netaknut", () => {
    expect(source).toMatch(/filter\.tenantId = new Types\.ObjectId\(decoded\.tenantId\)/);
  });
});

describe("klijentski UI ne traži pune termine radi dostupnosti", () => {
  it("ClientAppointments zauzeće vuče iz javnog feeda", () => {
    const ui = readFileSync(
      "src/components/client/ClientAppointments.tsx",
      "utf8",
    );
    expect(ui).toMatch(/usePublicOccupancy/);
    expect(ui).not.toMatch(/useAppointments\(\{\s*page: 1,\s*limit: 100/);
  });

  it("AppointmentCalendar spaja svoje termine sa anonimnim zauzećem", () => {
    const ui = readFileSync(
      "src/components/client/AppointmentCalendar.tsx",
      "utf8",
    );
    expect(ui).toMatch(/usePublicOccupancy/);
    expect(ui).toMatch(/ownAppointments/);
  });

  it("javni feed i dalje vraća samo zauzeće", () => {
    const feed = readFileSync(
      "src/app/api/public/[tenantSlug]/appointments/route.ts",
      "utf8",
    );
    expect(feed).toMatch(/\.select\("date time duration"\)/);
    for (const leaked of ["clientName", "clientEmail", "clientPhone", "request"]) {
      expect(feed).not.toContain(leaked);
    }
  });
});
