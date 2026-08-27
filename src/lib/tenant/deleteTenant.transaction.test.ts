import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/paddle", () => ({ cancelPaddleSubscription: vi.fn(async () => {}) }));

import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { Appointment } from "@/models/Appointment";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Subscription } from "@/models/Subscription";
import { Slot } from "@/models/Slot";
import { cancelPaddleSubscription } from "@/lib/paddle";
import { deleteTenantPermanently } from "./deleteTenant";

/**
 * Atomičnost trajnog brisanja salona.
 *
 * Cascade dodiruje ~30 kolekcija. Bez transakcije bi pad na sredini ostavio
 * poluobrisan salon — tačno stanje koje ovaj lifecycle postoji da eliminiše.
 * Ovaj test je vredniji od provere da cascade lista sadrži modele: on dokazuje
 * da ABORT ne ostavlja ništa iza sebe.
 */
describe.sequential("deleteTenantPermanently — atomičnost", () => {
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(replSet.getUri(), { dbName: "tenant-delete-test" });
  }, 120_000);

  beforeEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})),
    );
  });

  afterEach(() => vi.restoreAllMocks());

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet?.stop();
  });

  async function seedTenant(label: string) {
    const authUserId = new Types.ObjectId();
    const tenantId = new Types.ObjectId();
    const salonId = new Types.ObjectId();

    await AuthUser.collection.insertOne({
      _id: authUserId,
      email: `${label}@example.test`,
      passwordHash: "hash",
      platformRole: "OWNER",
      isEmailVerified: true,
    });
    await Tenant.collection.insertOne({
      _id: tenantId,
      name: label,
      slug: label,
      subdomain: label,
      ownerId: authUserId,
      status: "active",
    });
    await TenantUser.collection.insertOne({
      tenantId,
      authUserId,
      email: `${label}@example.test`,
      password: "hash",
      name: label,
      role: "OWNER",
    });
    await SalonProfile.collection.insertOne({ _id: salonId, tenantId, name: label, email: `${label}@example.test` });
    await Service.collection.insertOne({ tenantId, name: "Usluga", category: "test", type: "single", duration: 60 });
    await Appointment.collection.insertOne({ tenantId, clientName: "K", date: "2026-09-01", time: "10:00", duration: 60, status: "pending" });
    await LoyaltyLedger.collection.insertOne({ tenantId, amount: 10 });
    await Slot.collection.insertOne({ salonId, startTime: new Date(), endTime: new Date(), status: "maria" });

    return { tenantId, authUserId, salonId };
  }

  async function snapshot(tenantId: Types.ObjectId, salonId: Types.ObjectId) {
    return {
      tenant: await Tenant.countDocuments({ _id: tenantId }),
      members: await TenantUser.countDocuments({ tenantId }),
      profile: await SalonProfile.countDocuments({ tenantId }),
      services: await Service.countDocuments({ tenantId }),
      appointments: await Appointment.countDocuments({ tenantId }),
      loyalty: await LoyaltyLedger.countDocuments({ tenantId }),
      subscriptions: await Subscription.countDocuments({ tenantId }),
      slots: await Slot.countDocuments({ salonId }),
    };
  }

  it("uspešno brisanje uklanja SVE, uključujući Loyalty i Slot", async () => {
    const a = await seedTenant("salon-a");
    const b = await seedTenant("salon-b");

    await deleteTenantPermanently({ tenantId: a.tenantId.toString() });

    expect(await snapshot(a.tenantId, a.salonId)).toEqual({
      tenant: 0, members: 0, profile: 0, services: 0, appointments: 0, loyalty: 0, subscriptions: 0, slots: 0,
    });
    expect(await AuthUser.countDocuments({ _id: a.authUserId })).toBe(0);

    // Drugi salon je potpuno netaknut.
    expect(await snapshot(b.tenantId, b.salonId)).toEqual({
      tenant: 1, members: 1, profile: 1, services: 1, appointments: 1, loyalty: 1, subscriptions: 0, slots: 1,
    });
    expect(await AuthUser.countDocuments({ _id: b.authUserId })).toBe(1);
  });

  it("pad NASRED cascade-a abortuje transakciju — ništa nije obrisano", async () => {
    const a = await seedTenant("salon-c");
    const before = await snapshot(a.tenantId, a.salonId);

    // LoyaltyLedger je 17. u nizu — pada tek pošto su prethodne kolekcije
    // već „obrisane" unutar transakcije.
    const boom = vi
      .spyOn(LoyaltyLedger, "deleteMany")
      .mockRejectedValue(new Error("simulirani pad u sredini cascade-a"));

    await expect(
      deleteTenantPermanently({ tenantId: a.tenantId.toString() }),
    ).rejects.toThrow("simulirani pad u sredini cascade-a");

    boom.mockRestore();

    // Ključna tvrdnja: NIJEDAN dokument nije nestao.
    expect(await snapshot(a.tenantId, a.salonId)).toEqual(before);
    expect(await AuthUser.countDocuments({ _id: a.authUserId })).toBe(1);
  });

  it("ownership mismatch pada PRE bilo kakvog brisanja", async () => {
    const a = await seedTenant("salon-d");
    const before = await snapshot(a.tenantId, a.salonId);

    // Pozivalac koji nije vlasnik.
    await expect(
      deleteTenantPermanently({
        tenantId: a.tenantId.toString(),
        expectedOwnerAuthUserId: new Types.ObjectId().toString(),
      }),
    ).rejects.toMatchObject({ code: "TENANT_OWNERSHIP_INTEGRITY_ERROR" });

    expect(await snapshot(a.tenantId, a.salonId)).toEqual(before);
  });

  it("salon bez OWNER članstva se ne briše", async () => {
    const a = await seedTenant("salon-e");
    await TenantUser.deleteMany({ tenantId: a.tenantId });
    const before = await snapshot(a.tenantId, a.salonId);

    await expect(
      deleteTenantPermanently({ tenantId: a.tenantId.toString() }),
    ).rejects.toMatchObject({ code: "TENANT_OWNERSHIP_INTEGRITY_ERROR" });

    expect(await snapshot(a.tenantId, a.salonId)).toEqual(before);
  });

  it("nepostojeći owner AuthUser zaustavlja sve pre Paddle-a i DB write-a", async () => {
    const a = await seedTenant("salon-f");
    await Subscription.collection.insertOne({
      tenantId: a.tenantId,
      plan: "maria",
      status: "active",
      billingProvider: "paddle",
      paddleSubscriptionId: "sub_owner_missing",
    });
    await AuthUser.deleteOne({ _id: a.authUserId });
    const before = await snapshot(a.tenantId, a.salonId);

    await expect(
      deleteTenantPermanently({ tenantId: a.tenantId.toString() }),
    ).rejects.toMatchObject({ code: "TENANT_OWNERSHIP_INTEGRITY_ERROR" });

    expect(cancelPaddleSubscription).not.toHaveBeenCalled();
    expect(await snapshot(a.tenantId, a.salonId)).toEqual(before);
    expect(await AuthUser.countDocuments({ _id: a.authUserId })).toBe(0);
  });
});
