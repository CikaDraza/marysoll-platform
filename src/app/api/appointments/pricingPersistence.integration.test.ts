/**
 * Cena koju salon unese MORA završiti u bazi.
 *
 * Bug iz 9e50263: `applyQuote`/`applyChargedAmount` menjali su
 * `appointment.pricing` na učitanom Mongoose dokumentu, ali bez `save()` — a
 * završni `findOneAndUpdate` je dobijao `updatedData` bez `pricing`. Cena je
 * stizala u mejl (koji je čitao mutirani objekat), a nikad u Mongo.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Appointment } from "@/models/Appointment";
import {
  applyQuote,
  applyChargedAmount,
  emptyPricingSnapshot,
} from "@/lib/appointments/pricingSnapshot";
import type { IAppointmentPricing } from "@/types";

const TENANT = new Types.ObjectId();

/** Termin na upit sa poznatim dodatkom od 700 — Marijin stvarni slučaj. */
async function seedOnRequestAppointment() {
  return Appointment.create({
    tenantId: TENANT,
    clientProfileId: new Types.ObjectId(),
    clientName: "Nada Jojić",
    clientEmail: "nada@example.com",
    serviceName: "Izlivanje noktiju - Veličina 3",
    services: [
      {
        serviceId: new Types.ObjectId(),
        serviceName: "Veličina 3",
        quantity: 1,
        price: 0,
        duration: 130,
      },
    ],
    date: "2026-09-12",
    time: "14:00",
    duration: 130,
    status: "pending",
    messages: [],
    adminNotified: true,
    clientNotified: false,
    pricing: {
      ...emptyPricingSnapshot(),
      mode: "on_request",
      knownAddonsTotal: 700,
      lines: [
        { kind: "base", label: "Izlivanje noktiju", amount: null },
        { kind: "extra", label: "Stiker 3D", amount: 700, quantity: 1 },
      ],
    },
  });
}

/** Čitanje iz baze, tipovano samo do polja koja test proverava. */
async function reload(id: unknown) {
  return Appointment.findById(id).lean<{
    status: string;
    pricing: IAppointmentPricing;
  }>();
}

/** Isti upis koji ruta radi: snapshot ide u ATOMIC update, ne u memoriju. */
async function persistPricing(
  id: string,
  status: string,
  amount: number,
) {
  const appt = await Appointment.findById(id);
  const base = appt!.pricing ?? emptyPricingSnapshot();
  const pricing =
    status === "completed"
      ? applyChargedAmount(base, amount, "admin-1")
      : applyQuote(base, amount, "admin-1");
  return Appointment.findOneAndUpdate(
    { _id: id, tenantId: TENANT },
    { status, pricing },
    { new: true },
  );
}

describe.sequential("cena unesena u adminu se persistuje", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "pricing-persist-test" });
  }, 120_000);

  beforeEach(async () => {
    await Appointment.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it("polazno stanje: on_request, dodaci 700, bez cene", async () => {
    const appt = await seedOnRequestAppointment();
    const fresh = await reload(appt._id);
    expect(fresh!.pricing.mode).toBe("on_request");
    expect(fresh!.pricing.knownAddonsTotal).toBe(700);
    expect(fresh!.pricing.quotedTotal).toBeNull();
    expect(fresh!.pricing.chargedAmount).toBeNull();
  });

  it("REGRESIJA: odobrenje sa cenom 3000 stvarno stoji u Mongo-u", async () => {
    const appt = await seedOnRequestAppointment();
    await persistPricing(appt._id.toString(), "appointment_approved", 3000);

    // Ponovno čitanje IZ BAZE — ne iz vraćenog objekta.
    const reloaded = await reload(appt._id);
    expect(reloaded!.pricing.quotedBaseAmount).toBe(3000);
    expect(reloaded!.pricing.quotedTotal).toBe(3700); // 3000 + 700 dodataka
    expect(reloaded!.pricing.quotedBy).toBe("admin-1");
    expect(reloaded!.status).toBe("appointment_approved");
  });

  it("REGRESIJA: „Došla“ sa 3900 stvarno stoji u Mongo-u", async () => {
    const appt = await seedOnRequestAppointment();
    await persistPricing(appt._id.toString(), "appointment_approved", 3000);
    await persistPricing(appt._id.toString(), "completed", 3900);

    const reloaded = await reload(appt._id);
    expect(reloaded!.pricing.chargedAmount).toBe(3900);
    // Quote ostaje — snapshot pamti šta se znalo ranije.
    expect(reloaded!.pricing.quotedTotal).toBe(3700);
    expect(reloaded!.status).toBe("completed");
  });

  it("naplaćena nula se persistuje kao 0, ne kao „nema cene“", async () => {
    const appt = await seedOnRequestAppointment();
    await persistPricing(appt._id.toString(), "completed", 0);
    const reloaded = await reload(appt._id);
    expect(reloaded!.pricing.chargedAmount).toBe(0);
  });

  it("snapshot rezervacije ostaje netaknut posle oba unosa", async () => {
    const appt = await seedOnRequestAppointment();
    await persistPricing(appt._id.toString(), "appointment_approved", 3000);
    await persistPricing(appt._id.toString(), "completed", 3900);

    const reloaded = await reload(appt._id);
    expect(reloaded!.pricing.mode).toBe("on_request");
    expect(reloaded!.pricing.minimumTotal).toBeNull();
    expect(reloaded!.pricing.knownAddonsTotal).toBe(700);
    expect(reloaded!.pricing.lines).toHaveLength(2);
  });
});
