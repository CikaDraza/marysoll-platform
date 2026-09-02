/**
 * Canonical lifecycle izmene termina (T1-1).
 *
 * Izmena je do sada bila tiši put od zakazivanja: zakazivanje je prolazilo
 * kroz `resolveBookingRequest`, a izmena je uzimala `Service.findById` BEZ
 * tenant scope-a i verovala `duration`/`price` iz browsera. Ovi testovi drže
 * da su oba puta ista kapija.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { SalonProfile } from "@/models/SalonProfile";
import { rescheduleAppointmentAsClient } from "./clientFlows";
import type { IAppointmentService } from "@/types";

vi.mock("@/lib/notificationService", () => ({
  createAppointmentNotification: vi.fn(async () => null),
}));
vi.mock("@/lib/loyalty/hooks", () => ({
  loyaltyOnAppointmentStatusChange: vi.fn(async () => null),
}));

const TENANT = new Types.ObjectId().toString();
const OTHER_TENANT = new Types.ObjectId().toString();
const CLIENT = new Types.ObjectId();

/**
 * Datum/vreme u vremenskoj zoni salona (`Europe/Belgrade`).
 *
 * Faza termina se računa u zoni salona, pa test koji meša UTC datum sa
 * lokalnim vremenom peca sam sebe na promeni dana.
 */
function salonDateTime(offsetMinutes: number): { date: string; time: string } {
  const at = new Date(Date.now() + offsetMinutes * 60_000);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(at)
    .split(" ");
  return { date: parts[0], time: parts[1].slice(0, 5) };
}

/** Termin dovoljno daleko u budućnosti da je faza uvek `open`. */
function futureDate(daysAhead = 14): string {
  return salonDateTime(daysAhead * 24 * 60).date;
}

async function seedService(tenantId = TENANT) {
  return Service.create({
    tenantId,
    name: "Izlivanje noktiju",
    category: "Nokti",
    categorySlug: "nails",
    type: "variant",
    priceMode: "from",
    basePrice: 2000,
    duration: 120,
    variants: [
      { name: "Veličina 1", price: 0, additionalPrice: 0, duration: 120, perItem: false },
      { name: "Veličina 5", price: 0, additionalPrice: 800, duration: 150, perItem: false },
    ],
    extras: [
      { name: "Stiker 3D", price: 700, duration: 10, perItem: true, allowQuantity: true },
    ],
    items: [],
  });
}

async function seedProfile(tenantId = TENANT) {
  return SalonProfile.create({
    tenantId,
    name: "Marysoll",
    email: "salon@example.com",
    availabilityMode: "workingHours",
    // Dani su srpski nazivi — `DAY_MAP` u `parseWorkingHours`.
    workingHours: Object.fromEntries(
      [
        "Ponedeljak",
        "Utorak",
        "Sreda",
        "Četvrtak",
        "Petak",
        "Subota",
        "Nedelja",
      ].map((day) => [day, [{ from: "08:00", to: "20:00" }]]),
    ),
  });
}

async function seedAppointment(
  serviceId: string,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return Appointment.create({
    tenantId: TENANT,
    clientProfileId: CLIENT,
    clientName: "Nada",
    clientEmail: "nada@example.com",
    serviceName: "Izlivanje noktiju - Veličina 1",
    services: [
      {
        serviceId,
        serviceName: "Veličina 1",
        quantity: 1,
        price: 2000,
        duration: 120,
        variants: [
          { name: "Veličina 1", price: 0, duration: 120, perItem: false },
        ],
      },
    ],
    pricing: {
      mode: "from",
      currency: "RSD",
      baseAmount: 2000,
      minimumTotal: 2000,
      knownAddonsTotal: 0,
      lines: [{ kind: "base", label: "Osnovna cena", amount: 2000 }],
    },
    date: futureDate(),
    time: "10:00",
    duration: 120,
    status: "pending",
    cancellationWindowHours: 1,
    messages: [],
    adminNotified: true,
    clientNotified: false,
    ...overrides,
  });
}

function itemOf(appt: { services: IAppointmentService[] }) {
  return appt.services[0];
}

describe.sequential("izmena termina — canonical lifecycle", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "reschedule-lifecycle" });
  }, 120_000);

  beforeEach(async () => {
    await Promise.all([
      Appointment.deleteMany({}),
      Service.deleteMany({}),
      SalonProfile.deleteMany({}),
    ]);
    await seedProfile();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it("trajanje dolazi iz kataloga — `duration` iz zahteva se ignoriše", async () => {
    const svc = await seedService();
    const appt = await seedAppointment(svc._id.toString());

    const result = await rescheduleAppointmentAsClient(appt as never, {
      date: futureDate(15),
      time: "11:00",
      // Klijent tvrdi pet minuta; katalog kaže 150 (Veličina 5).
      duration: 5,
      services: [
        {
          serviceId: svc._id.toString(),
          serviceName: "Veličina 5",
          quantity: 1,
          price: 1,
          duration: 5,
        },
      ],
    });

    expect(result.ok).toBe(true);
    const stored = await Appointment.findById(appt._id).lean<never>();
    expect((stored as never as { duration: number }).duration).toBe(150);
  });

  it("REGRESIJA: usluga drugog salona se ne može zakačiti na termin", async () => {
    const mine = await seedService();
    const theirs = await seedService(OTHER_TENANT);
    const appt = await seedAppointment(mine._id.toString());

    const result = await rescheduleAppointmentAsClient(appt as never, {
      date: futureDate(15),
      time: "11:00",
      services: [
        {
          serviceId: theirs._id.toString(),
          serviceName: "Veličina 1",
          quantity: 1,
          price: 1,
          duration: 60,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("service_not_found");
  });

  it("izabrani dodaci se upisuju u termin (izbor, ne samo iznos)", async () => {
    const svc = await seedService();
    const appt = await seedAppointment(svc._id.toString());

    await rescheduleAppointmentAsClient(appt as never, {
      date: futureDate(15),
      time: "11:00",
      services: [
        {
          serviceId: svc._id.toString(),
          serviceName: "Veličina 1",
          quantity: 1,
          price: 0,
          duration: 0,
          extras: [
            { name: "Stiker 3D", price: 700, duration: 10, perItem: true, quantity: 2 },
          ],
        },
      ],
    });

    const stored = await Appointment.findById(appt._id).lean<never>();
    const item = itemOf(stored as never);
    expect(item.extras?.[0]).toMatchObject({ name: "Stiker 3D", quantity: 2 });
  });

  it("REGRESIJA: neuspela izmena ne označava termin kao kasno otkazan", async () => {
    const svc = await seedService();
    // Termin je za 30 minuta, a rok za izmenu je sat vremena pre početka —
    // faza je `late`: otkazivanje je još moguće, izmena nije.
    const soon = salonDateTime(30);
    const created = await seedAppointment(svc._id.toString(), {
      date: soon.date,
      time: soon.time,
    });
    // Grace period od 30 min posle rezervacije drži fazu `open` bez obzira na
    // salonov rok — termin mora biti stariji od njega da bi test gađao rok.
    // Direktno kroz drajver: Mongoose štiti `createdAt` od `$set`-a i tiho ga
    // izbacuje iz update-a, pa se starenje zapisa ne može odigrati kroz model.
    await Appointment.collection.updateOne(
      { _id: created._id },
      { $set: { createdAt: new Date(Date.now() - 2 * 60 * 60_000) } },
    );
    const appt = await Appointment.findById(created._id);

    const result = await rescheduleAppointmentAsClient(appt as never, {
      date: futureDate(15),
      time: "11:00",
      services: [
        {
          serviceId: svc._id.toString(),
          serviceName: "Veličina 1",
          quantity: 1,
          price: 2000,
          duration: 120,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("expired");

    // Odbijen pokušaj izmene NIJE otkazivanje: termin i dalje važi i
    // klijentkinja i dalje dolazi.
    const stored = await Appointment.findById(appt._id).lean<never>();
    expect((stored as never as { cancellationStatus: string }).cancellationStatus).toBe(
      "can_cancel",
    );
    expect((stored as never as { status: string }).status).toBe("pending");
  });

  it("pomeranje termina ČUVA potvrđenu cenu", async () => {
    const svc = await seedService();
    const appt = await seedAppointment(svc._id.toString(), {
      pricing: {
        mode: "from",
        currency: "RSD",
        baseAmount: 2000,
        minimumTotal: 2000,
        knownAddonsTotal: 0,
        // Salon je već potvrdio cenu.
        quotedBaseAmount: 3500,
        quotedTotal: 3500,
        quotedAt: new Date(),
        quotedBy: "admin-1",
        lines: [],
      },
    });

    await rescheduleAppointmentAsClient(appt as never, {
      date: futureDate(16),
      time: "12:00",
      services: [
        {
          serviceId: svc._id.toString(),
          serviceName: "Veličina 1",
          quantity: 1,
          price: 2000,
          duration: 120,
        },
      ],
    });

    const stored = await Appointment.findById(appt._id).lean<never>();
    // Sat vremena ranije nije nova usluga — dogovorena cena ostaje.
    expect((stored as never as { pricing: { quotedTotal: number } }).pricing.quotedTotal).toBe(
      3500,
    );
  });

  it("promena izbora PONIŠTAVA staru ponudu i pravi nov snapshot", async () => {
    const svc = await seedService();
    const appt = await seedAppointment(svc._id.toString(), {
      pricing: {
        mode: "from",
        currency: "RSD",
        baseAmount: 2000,
        minimumTotal: 2000,
        knownAddonsTotal: 0,
        quotedBaseAmount: 3500,
        quotedTotal: 3500,
        quotedAt: new Date(),
        quotedBy: "admin-1",
        lines: [],
      },
    });

    await rescheduleAppointmentAsClient(appt as never, {
      date: appt.date,
      time: appt.time,
      services: [
        {
          serviceId: svc._id.toString(),
          // Veličina 5 je druga usluga po ceni i trajanju.
          serviceName: "Veličina 5",
          quantity: 1,
          price: 2000,
          duration: 120,
        },
      ],
    });

    const stored = await Appointment.findById(appt._id).lean<never>();
    const pricing = (stored as never as {
      pricing: { quotedTotal: number | null; minimumTotal: number };
    }).pricing;
    // Ponuda od 3500 odnosila se na Veličinu 1 — više ne važi.
    expect(pricing.quotedTotal).toBeNull();
    expect(pricing.minimumTotal).toBe(2800); // 2000 + 800 doplata
    expect((stored as never as { duration: number }).duration).toBe(150);
  });

  it("REGRESIJA: cena dodatka iz browsera se ne upisuje", async () => {
    // Dok je Mongoose tiho odbacivao `extras`, ovo je prolazilo neopaženo.
    // Čim model počne da čuva izbor, payload postaje put u bazu — pa stavka
    // mora biti server-generated, ne spread `...s` iz zahteva.
    const svc = await seedService();
    const appt = await seedAppointment(svc._id.toString());

    await rescheduleAppointmentAsClient(appt as never, {
      date: futureDate(15),
      time: "11:00",
      services: [
        {
          serviceId: svc._id.toString(),
          serviceName: "Veličina 1",
          quantity: 1,
          price: 1,
          duration: 5,
          extras: [
            // Katalog kaže 700; zahtev tvrdi 1.
            { name: "Stiker 3D", price: 1, duration: 0, perItem: true, quantity: 1 },
          ],
        },
      ],
    });

    const stored = await Appointment.findById(appt._id).lean<never>();
    const item = itemOf(stored as never);
    expect(item.extras?.[0]?.price).toBe(700);
    expect(item.extras?.[0]?.duration).toBe(10);
    expect(item.price).toBe(2700); // 2000 osnovna + 700 dodatak
  });

  it("REGRESIJA: podmetnut request se odbija kada usluga nema intake", async () => {
    const svc = await seedService();
    const appt = await seedAppointment(svc._id.toString());

    const result = await rescheduleAppointmentAsClient(appt as never, {
      date: appt.date,
      time: appt.time,
      services: appt.services as IAppointmentService[],
      request: { note: "Ovo UI ne bi ponudio" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("invalid_request");
    const stored = await Appointment.findById(appt._id).lean();
    expect(stored).not.toHaveProperty("request");
  });

  it("intake-enabled izmena čuva autentifikovan request", async () => {
    const svc = await seedService();
    await Service.updateOne(
      { _id: svc._id },
      { $set: { bookingIntake: { enabled: true } } },
    );
    const appt = await seedAppointment(svc._id.toString());

    const result = await rescheduleAppointmentAsClient(appt as never, {
      date: appt.date,
      time: appt.time,
      services: appt.services as IAppointmentService[],
      request: { note: "Badem oblik sa tankim frenchom" },
    });

    expect(result.ok).toBe(true);
    const stored = await Appointment.findById(appt._id).lean<never>();
    expect(
      (stored as never as { request?: { note?: string } }).request?.note,
    ).toBe("Badem oblik sa tankim frenchom");
  });
});
