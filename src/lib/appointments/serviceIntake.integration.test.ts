/**
 * `bookingIntake` mora da preživi upis i da ga server poštuje.
 *
 * Mongoose strict tiho odbacuje polja koja nisu u šemi, pa se persistencija
 * nove poslovne konfiguracije dokazuje nad pravim Mongo-om, ne pretpostavlja.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Service } from "@/models/Service";
import { serviceRequiresIntake } from "./serviceIntake";
import { resolveBookingRequest } from "@/lib/booking/resolveBookingRequest";

const TENANT_A = new Types.ObjectId().toString();
const TENANT_B = new Types.ObjectId().toString();

function base(tenantId: string, extra: Record<string, unknown> = {}) {
  return {
    tenantId,
    name: "Izlivanje noktiju",
    category: "Nokti",
    categorySlug: "nails",
    type: "single",
    basePrice: 2000,
    duration: 120,
    items: [],
    ...extra,
  };
}

describe.sequential("bookingIntake persistencija i granica", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "service-intake-test" });
  }, 120_000);

  beforeEach(async () => {
    await Service.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it("nova usluga podrazumevano NEMA zahtev", async () => {
    const svc = await Service.create(base(TENANT_A));
    const stored = await Service.findById(svc._id).lean<{
      bookingIntake?: { enabled?: boolean };
    }>();
    expect(stored!.bookingIntake?.enabled).toBe(false);
  });

  it("uključen zahtev preživljava upis i čitanje", async () => {
    const svc = await Service.create(
      base(TENANT_A, { bookingIntake: { enabled: true } }),
    );
    const stored = await Service.findById(svc._id).lean<never>();
    expect(serviceRequiresIntake(stored as never)).toBe(true);
  });

  it("canonical resolver nosi rešenu činjenicu do servera", async () => {
    const on = await Service.create(
      base(TENANT_A, { bookingIntake: { enabled: true } }),
    );
    const off = await Service.create(base(TENANT_A, { name: "Šminkanje" }));

    const a = await resolveBookingRequest({
      tenantId: TENANT_A,
      serviceId: on._id.toString(),
    });
    const b = await resolveBookingRequest({
      tenantId: TENANT_A,
      serviceId: off._id.toString(),
    });

    expect(a.intake.enabled).toBe(true);
    expect(b.intake.enabled).toBe(false);
  });

  it("konfiguracija salona A ne utiče na salon B", async () => {
    const a = await Service.create(
      base(TENANT_A, { bookingIntake: { enabled: true } }),
    );
    const b = await Service.create(base(TENANT_B));

    expect(
      (await resolveBookingRequest({
        tenantId: TENANT_A,
        serviceId: a._id.toString(),
      })).intake.enabled,
    ).toBe(true);

    expect(
      (await resolveBookingRequest({
        tenantId: TENANT_B,
        serviceId: b._id.toString(),
      })).intake.enabled,
    ).toBe(false);
  });

  it("KLJUČNO: nokti bez konfiguracije nemaju zahtev", async () => {
    const nails = await Service.create(base(TENANT_A, { categorySlug: "nails" }));
    const resolved = await resolveBookingRequest({
      tenantId: TENANT_A,
      serviceId: nails._id.toString(),
    });
    expect(resolved.intake.enabled).toBe(false);
  });

  it("KLJUČNO: šminka sa konfiguracijom ima zahtev", async () => {
    const makeup = await Service.create(
      base(TENANT_A, {
        name: "Svečana šminka",
        category: "Šminka",
        categorySlug: "makeup",
        bookingIntake: { enabled: true },
      }),
    );
    const resolved = await resolveBookingRequest({
      tenantId: TENANT_A,
      serviceId: makeup._id.toString(),
    });
    expect(resolved.intake.enabled).toBe(true);
  });
});
