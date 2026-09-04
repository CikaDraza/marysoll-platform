/**
 * Izbor usluge mora da preživi upis.
 *
 * NALAZ (T1-1, dokazano pre izmene modela): `IAppointmentService` je u
 * TypeScript-u deklarisao `variants` i `extras`, ali ih `servicesSchema` nije
 * imao. Mongoose ih je u strict režimu TIHO odbacivao — UI ih je slao, rute
 * prosleđivale, a u bazi ih nije bilo.
 *
 * Posledica nije bila kozmetička: „Promeni termin" je otvarao termin bez
 * ijednog dodatka koji je klijentkinja izabrala, pa je svaka izmena datuma
 * nečujno brisala dodatke iz termina. `pricing.lines` čuva IZNOSE i tu ne
 * pomaže — iz „Stiker 3D · 700" se ne zna koliko je komada izabrano.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Appointment } from "@/models/Appointment";
import type { IAppointmentService } from "@/types";

const TENANT = new Types.ObjectId();

async function createWithSelection() {
  return Appointment.create({
    tenantId: TENANT,
    clientProfileId: new Types.ObjectId(),
    clientName: "Nada",
    clientEmail: "nada@example.com",
    serviceName: "Izlivanje - Veličina 3",
    services: [
      {
        serviceId: new Types.ObjectId(),
        serviceName: "Veličina 3",
        quantity: 1,
        price: 2700,
        duration: 130,
        variants: [
          { name: "Veličina 3", price: 2000, duration: 120, perItem: false },
        ],
        extras: [
          {
            name: "Stiker 3D",
            price: 700,
            duration: 10,
            perItem: true,
            quantity: 3,
          },
        ],
      },
    ],
    date: "2026-09-12",
    time: "14:00",
    duration: 130,
    status: "pending",
    messages: [],
    adminNotified: true,
    clientNotified: false,
  });
}

async function storedItem(id: unknown): Promise<IAppointmentService> {
  const stored = await Appointment.findById(id).lean<{
    services: IAppointmentService[];
  }>();
  return stored!.services[0];
}

describe.sequential("izbor usluge u terminu", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "appt-selection-test" });
  }, 120_000);

  beforeEach(async () => {
    await Appointment.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it("čuva osnovna polja stavke", async () => {
    const appt = await createWithSelection();
    const item = await storedItem(appt._id);
    expect(item.serviceName).toBe("Veličina 3");
    expect(item.price).toBe(2700);
    expect(item.duration).toBe(130);
  });

  it("REGRESIJA: dodaci preživljavaju upis, sa količinom", async () => {
    const appt = await createWithSelection();
    const item = await storedItem(appt._id);
    expect(item.extras).toHaveLength(1);
    expect(item.extras?.[0]).toMatchObject({
      name: "Stiker 3D",
      price: 700,
      duration: 10,
      perItem: true,
      quantity: 3,
    });
  });

  it("REGRESIJA: izabrana varijanta preživljava upis", async () => {
    const appt = await createWithSelection();
    const item = await storedItem(appt._id);
    expect(item.variants).toHaveLength(1);
    expect(item.variants?.[0]?.name).toBe("Veličina 3");
  });

  it("cena dodatka `null` ostaje `null` — ne postaje 0", async () => {
    // 0 je stvarna nula dinara; `null` je „ne zna se". Kad bi se čuvalo kao 0,
    // usluga na upit bi u statistici izgledala kao besplatna usluga.
    const appt = await Appointment.create({
      tenantId: TENANT,
      clientProfileId: new Types.ObjectId(),
      clientName: "Nada",
      clientEmail: "nada@example.com",
      serviceName: "Nadogradnja",
      services: [
        {
          serviceId: new Types.ObjectId(),
          serviceName: "Nadogradnja",
          quantity: 1,
          price: null,
          duration: 90,
          extras: [
            { name: "Crtež", price: null, duration: 15, perItem: false },
          ],
        },
      ],
      date: "2026-09-12",
      time: "16:00",
      duration: 90,
      status: "pending",
      messages: [],
      adminNotified: true,
      clientNotified: false,
    });
    const item = await storedItem(appt._id);
    expect(item.price).toBeNull();
    expect(item.extras?.[0]?.price).toBeNull();
  });

  it("stavka bez izbora ne dobija prazne nizove", async () => {
    // `extras: []` i `extras: undefined` nisu ista tvrdnja — prvo znači
    // „provereno, nema dodataka", drugo „nije ni bilo izbora".
    const appt = await Appointment.create({
      tenantId: TENANT,
      clientProfileId: new Types.ObjectId(),
      clientName: "Nada",
      clientEmail: "nada@example.com",
      serviceName: "Manikir",
      services: [
        {
          serviceId: new Types.ObjectId(),
          serviceName: "Manikir",
          quantity: 1,
          price: 1200,
          duration: 45,
        },
      ],
      date: "2026-09-12",
      time: "10:00",
      duration: 45,
      status: "pending",
      messages: [],
      adminNotified: true,
      clientNotified: false,
    });
    const item = await storedItem(appt._id);
    expect(item.extras).toBeUndefined();
    expect(item.variants).toBeUndefined();
  });
});
