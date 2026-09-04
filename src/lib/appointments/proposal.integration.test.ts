/**
 * Predlog salona → odluka klijentkinje.
 *
 * Dva pravila koja su ranije nedostajala:
 *   1. Predlog ne rezerviše slot — provera je u trenutku PRIHVATANJA.
 *   2. Odluka mora obrisati predlog. `{ proposedDate: undefined }` Mongoose
 *      izbacuje iz update-a, pa je predlog preživljavao odgovor.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Appointment } from "@/models/Appointment";
import { SalonProfile } from "@/models/SalonProfile";
import { CLEAR_PROPOSAL_UNSET, evaluateProposalDecision } from "./proposal";

const TENANT = new Types.ObjectId().toString();

function inDays(days: number): string {
  const at = new Date(Date.now() + days * 24 * 60 * 60_000);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

async function seedAppointment(overrides: Record<string, unknown> = {}) {
  return Appointment.create({
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
        duration: 60,
      },
    ],
    date: inDays(7),
    time: "10:00",
    duration: 60,
    status: "pending",
    messages: [],
    adminNotified: true,
    clientNotified: false,
    ...overrides,
  });
}

describe.sequential("predlog termina", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "proposal-test" });
  }, 120_000);

  beforeEach(async () => {
    await Promise.all([Appointment.deleteMany({}), SalonProfile.deleteMany({})]);
    await SalonProfile.create({
      tenantId: TENANT,
      name: "Marysoll",
      email: "salon@example.com",
      availabilityMode: "workingHours",
      workingHours: Object.fromEntries(
        ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"].map(
          (d) => [d, [{ from: "08:00", to: "20:00" }]],
        ),
      ),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it("prihvatanje slobodnog predloga vraća novo vreme", async () => {
    const appt = await seedAppointment({
      status: "appointment_rescheduled",
      proposedDate: inDays(9),
      proposedTime: "15:00",
    });

    const result = await evaluateProposalDecision(appt as never, "accept");

    expect(result).toEqual({ ok: true, kind: "accepted", date: inDays(9), time: "15:00" });
  });

  it("REGRESIJA: predlog popunjen u međuvremenu se NE prihvata", async () => {
    const appt = await seedAppointment({
      status: "appointment_rescheduled",
      proposedDate: inDays(9),
      proposedTime: "15:00",
    });
    // Neko drugi je u međuvremenu uzeo baš to vreme.
    await seedAppointment({ date: inDays(9), time: "15:00", status: "appointment_approved" });

    const result = await evaluateProposalDecision(appt as never, "accept");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("conflict");
  });

  it("sopstveno staro vreme nije prepreka novom", async () => {
    // Predlog pomera termin unutar istog dana tako da se stari i novi
    // interval seku. Bez izuzimanja sebe, termin bi blokirao sam sebe.
    const appt = await seedAppointment({
      status: "appointment_rescheduled",
      date: inDays(9),
      time: "15:00",
      proposedDate: inDays(9),
      proposedTime: "15:30",
    });

    const result = await evaluateProposalDecision(appt as never, "accept");

    expect(result.ok).toBe(true);
  });

  it("odbijanje ne proverava dostupnost — termin ostaje gde je bio", async () => {
    const appt = await seedAppointment({
      status: "appointment_rescheduled",
      proposedDate: inDays(9),
      proposedTime: "15:00",
    });
    await seedAppointment({ date: inDays(9), time: "15:00", status: "appointment_approved" });

    const result = await evaluateProposalDecision(appt as never, "reject");

    expect(result).toEqual({ ok: true, kind: "rejected" });
  });

  it("termin bez predloga nema šta da odluči", async () => {
    const appt = await seedAppointment();
    const result = await evaluateProposalDecision(appt as never, "accept");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("no_proposal");
  });

  it("otkazan termin ne prihvata predlog", async () => {
    const appt = await seedAppointment({
      status: "appointment_cancelled",
      proposedDate: inDays(9),
      proposedTime: "15:00",
    });
    const result = await evaluateProposalDecision(appt as never, "accept");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("final");
  });

  it("REGRESIJA: `$unset` zaista briše predlog, `undefined` ne bi", async () => {
    const appt = await seedAppointment({
      status: "appointment_rescheduled",
      proposedDate: inDays(9),
      proposedTime: "15:00",
    });

    // Zatečeno ponašanje koje je pravilo bug: Mongoose izbacuje `undefined`
    // ključeve iz update-a, pa predlog preživi odluku.
    await Appointment.findOneAndUpdate(
      { _id: appt._id },
      { status: "appointment_approved", proposedDate: undefined, proposedTime: undefined },
      { new: true },
    );
    const stillThere = await Appointment.findById(appt._id).lean<{
      proposedDate?: string;
    }>();
    expect(stillThere?.proposedDate).toBe(inDays(9));

    // Ispravno brisanje.
    await Appointment.findOneAndUpdate(
      { _id: appt._id },
      { status: "appointment_approved", $unset: CLEAR_PROPOSAL_UNSET },
      { new: true },
    );
    const cleared = await Appointment.findById(appt._id).lean<{
      proposedDate?: string;
      proposedTime?: string;
    }>();
    expect(cleared?.proposedDate).toBeUndefined();
    expect(cleared?.proposedTime).toBeUndefined();
  });
});
