/**
 * Server je autoritet za trajanje, cenu i selekciju.
 *
 * Do sada je browser slao `duration` i `price`, a server ih je prihvatao. Ovi
 * testovi drže granicu: zahtev može tvrditi šta hoće, canonical vrednosti
 * dolaze iz baze — i ref iz tuđe usluge ili tuđeg salona se odbija.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Service } from "@/models/Service";
import { resolveBookingRequest } from "./resolveBookingRequest";
import { BookingError } from "./errors";

const TENANT = new Types.ObjectId().toString();
const OTHER_TENANT = new Types.ObjectId().toString();

async function seedVariantService(tenantId = TENANT) {
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

describe.sequential("resolveBookingRequest — server authority", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "resolve-booking-test" });
  }, 120_000);

  beforeEach(async () => {
    await Service.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it("trajanje dolazi iz kataloga, ne iz zahteva", async () => {
    const svc = await seedVariantService();
    const variantRef = String(svc.variants[1]._id); // Veličina 5 → 150 min

    const resolved = await resolveBookingRequest({
      tenantId: TENANT,
      serviceId: svc._id.toString(),
      selection: { variantRef },
    });

    expect(resolved.durationMinutes).toBe(150);
  });

  it("cena dolazi iz kataloga — „od 2000 + 800 doplata + 700 dodatak“", async () => {
    const svc = await seedVariantService();
    const resolved = await resolveBookingRequest({
      tenantId: TENANT,
      serviceId: svc._id.toString(),
      selection: {
        variantRef: String(svc.variants[1]._id),
        extraRefs: [{ ref: String(svc.extras[0]._id), quantity: 1 }],
      },
    });

    expect(resolved.pricing.mode).toBe("from");
    expect(resolved.pricing.total).toBe(3500); // 2000 + 800 + 700
    expect(resolved.pricing.knownAddonsTotal).toBe(1500);
  });

  it("količina dodatka množi cenu i trajanje", async () => {
    const svc = await seedVariantService();
    const resolved = await resolveBookingRequest({
      tenantId: TENANT,
      serviceId: svc._id.toString(),
      selection: {
        variantRef: String(svc.variants[0]._id), // 120 min, doplata 0
        extraRefs: [{ ref: String(svc.extras[0]._id), quantity: 3 }],
      },
    });

    expect(resolved.durationMinutes).toBe(150); // 120 + 3×10
    expect(resolved.pricing.total).toBe(4100); // 2000 + 0 + 3×700
  });

  it("SIGURNOST: podmetnut ref se odbija", async () => {
    const svc = await seedVariantService();
    await expect(
      resolveBookingRequest({
        tenantId: TENANT,
        serviceId: svc._id.toString(),
        selection: { variantRef: new Types.ObjectId().toString() },
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("SIGURNOST: ref iz DRUGE usluge istog salona se odbija", async () => {
    const a = await seedVariantService();
    const b = await seedVariantService();
    await expect(
      resolveBookingRequest({
        tenantId: TENANT,
        serviceId: a._id.toString(),
        selection: { variantRef: String(b.variants[0]._id) },
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("SIGURNOST: usluga drugog salona se ne razrešava", async () => {
    const foreign = await seedVariantService(OTHER_TENANT);
    await expect(
      resolveBookingRequest({
        tenantId: TENANT,
        serviceId: foreign._id.toString(),
        selection: { variantRef: String(foreign.variants[0]._id) },
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("SIGURNOST: podmetnut ref dodatka se odbija", async () => {
    const svc = await seedVariantService();
    await expect(
      resolveBookingRequest({
        tenantId: TENANT,
        serviceId: svc._id.toString(),
        selection: {
          variantRef: String(svc.variants[0]._id),
          extraRefs: [{ ref: new Types.ObjectId().toString(), quantity: 1 }],
        },
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("zatečeni klijent koji šalje IMENA prolazi kroz istu validaciju", async () => {
    const svc = await seedVariantService();
    const resolved = await resolveBookingRequest({
      tenantId: TENANT,
      serviceId: svc._id.toString(),
      selection: {
        variantName: "Veličina 5",
        extras: [{ name: "Stiker 3D", quantity: 1 }],
      },
    });
    expect(resolved.durationMinutes).toBe(160); // 150 varijanta + 10 dodatak
    expect(resolved.pricing.total).toBe(3500);
    expect(resolved.variantName).toBe("Veličina 5");
  });

  it("nepostojeće ime varijante se odbija", async () => {
    const svc = await seedVariantService();
    await expect(
      resolveBookingRequest({
        tenantId: TENANT,
        serviceId: svc._id.toString(),
        selection: { variantName: "Veličina 99" },
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("on_request usluga: trajanje poznato, cena null", async () => {
    const svc = await Service.create({
      tenantId: TENANT,
      name: "Izlivanje nokta",
      category: "Nokti",
      categorySlug: "nails",
      type: "single",
      priceMode: "on_request",
      duration: 120,
      extras: [{ name: "Stiker 3D", price: 700, duration: 10, perItem: true }],
      items: [],
    });

    const resolved = await resolveBookingRequest({
      tenantId: TENANT,
      serviceId: svc._id.toString(),
      selection: { extraRefs: [{ ref: String(svc.extras[0]._id), quantity: 1 }] },
    });

    expect(resolved.durationMinutes).toBe(130);
    expect(resolved.pricing.total).toBeNull();
    expect(resolved.pricing.knownAddonsTotal).toBe(700);
    expect(resolved.pricing.mode).toBe("on_request");
  });
});

describe.sequential("2B — vaučer čeka numeričku osnovicu", () => {
  it("dokumentovano ponašanje: on_request nema osnovicu za popust", async () => {
    // Vaučer je PRAVILO popusta i ne mora znati cenu pri rezervaciji.
    // Dok je `pricing.total` null, `discountAmount` i `finalPrice` ostaju null —
    // 0 bi značilo „obračunato nad cenom nula", što nije isto što i
    // „još nije obračunato".
    const { estimateServicePrice } = await import("@/helpers/servicePrice");
    const { buildPricingSnapshot } = await import(
      "@/lib/appointments/pricingSnapshot"
    );
    const estimate = estimateServicePrice({
      service: {
        _id: "s", name: "Izlivanje", category: "Nokti", type: "single",
        priceMode: "on_request", duration: 120, description: "", items: [],
        subscription: { enabled: false }, createdAt: "", updatedAt: "",
        extras: [{ name: "Stiker", price: 700, duration: 10, perItem: true }],
      } as never,
      extras: [{ name: "Stiker", quantity: 1 }],
    });
    const snapshot = buildPricingSnapshot(estimate);
    expect(snapshot.minimumTotal).toBeNull();
    expect(snapshot.knownAddonsTotal).toBe(700);
  });
});
