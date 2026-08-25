/**
 * Tri-state `enabled` za sedam theme-9 sekcija — empirijski, nad stvarnim Mongo-om.
 *
 * ZAŠTO POSTOJI: pre 2B je `enabled` imao `default: false`, a Mongoose
 * materijalizuje ceo `landingStructure` i kada pozivalac ne pošalje ništa. Zato
 * su „nikad konfigurisano" i „vlasnica je izričito ugasila" postajali isti
 * zapis — `{ enabled: false }` — i nijedan resolver ih više nije mogao
 * razlikovati. Informacija se gubila u modelu, ne u logici, pa se i popravlja
 * u modelu.
 *
 * Test je namerno nad pravom bazom, ne nad tipom: pitanje je šta Mongo VRATI,
 * a to zavisi od materijalizacije i od načina čitanja (`lean` vs hidrirano),
 * što se iz TypeScript-a ne vidi.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SalonProfile } from "@/models/SalonProfile";

/** Sedam sekcija uvedenih sa theme-9; jedine koje nose tri-state. */
const TRI_STATE_BLOCKS = [
  "audiencePaths",
  "topicHub",
  "guidedCareProcess",
  "credentials",
  "finalCta",
  "featuredEducation",
  "professionalPath",
] as const;

/** Sekcije starijih tema — one i dalje imaju default i to se ne dira. */
const DEFAULTED_BLOCKS: Record<string, boolean> = {
  hero: true,
  about: true,
  gallery: true,
  faq: true,
  blog: false,
  perks: false,
};

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const profile = (landingStructure?: object) => ({
  tenantId: new Types.ObjectId(),
  name: "Tri-state proba",
  email: "probe@example.com",
  ...(landingStructure ? { landingStructure } : {}),
});

type LandingBag = Record<string, { enabled?: boolean } | undefined>;
interface WithLanding {
  landingStructure?: { landing?: LandingBag };
}

/** Isti dokument pročitan na tri načina — oblik odgovora zavisi od načina. */
async function readAllWays(id: Types.ObjectId) {
  const lean = (await SalonProfile.findById(id).lean()) as WithLanding | null;
  const hydrated = await SalonProfile.findById(id);
  const raw = (await SalonProfile.collection.findOne({
    _id: id,
  })) as WithLanding | null;
  return {
    lean: lean?.landingStructure?.landing ?? {},
    hydrated: (hydrated?.landingStructure?.landing ?? {}) as LandingBag,
    raw: raw?.landingStructure?.landing ?? {},
  };
}

describe("theme-9 sekcije: enabled je tri-state, ne boolean", () => {
  it("dokument bez ijedne vrednosti NE dobija `enabled` — stanje ostaje `undefined`", async () => {
    const doc = await SalonProfile.create(profile());
    const { lean, hydrated, raw } = await readAllWays(doc._id);

    for (const block of TRI_STATE_BLOCKS) {
      // Objekat i dalje postoji (nizovi u njemu imaju svoje default-e) —
      // upravo zato je odsustvo `enabled` upotrebljiv signal.
      expect(raw[block], `${block} raw`).toBeDefined();
      expect(raw[block]?.enabled, `${block} raw.enabled`).toBeUndefined();
      expect(lean[block]?.enabled, `${block} lean.enabled`).toBeUndefined();
      expect(hydrated[block]?.enabled, `${block} hydrated.enabled`).toBeUndefined();
    }
  });

  it("sekcije starijih tema zadržavaju svoje default-e", async () => {
    const doc = await SalonProfile.create(profile());
    const { raw } = await readAllWays(doc._id);
    for (const [block, expected] of Object.entries(DEFAULTED_BLOCKS)) {
      expect(raw[block]?.enabled, `${block}`).toBe(expected);
    }
  });

  it("izričito `false` se čuva kao `false`, a ne kao odsustvo", async () => {
    const doc = await SalonProfile.create(
      profile({ landing: { audiencePaths: { enabled: false } } }),
    );
    const { lean, hydrated, raw } = await readAllWays(doc._id);
    expect(raw.audiencePaths?.enabled).toBe(false);
    expect(lean.audiencePaths?.enabled).toBe(false);
    expect(hydrated.audiencePaths?.enabled).toBe(false);
  });

  it("izričito `true` se čuva kao `true`", async () => {
    const doc = await SalonProfile.create(
      profile({ landing: { audiencePaths: { enabled: true } } }),
    );
    const { raw } = await readAllWays(doc._id);
    expect(raw.audiencePaths?.enabled).toBe(true);
  });

  it("tri stanja su međusobno razlučiva u istom čitanju", async () => {
    const doc = await SalonProfile.create(
      profile({
        landing: {
          audiencePaths: { enabled: true },
          topicHub: { enabled: false },
          // `credentials` se ne pominje — ostaje bez odluke.
        },
      }),
    );
    const { lean } = await readAllWays(doc._id);
    expect(lean.audiencePaths?.enabled).toBe(true);
    expect(lean.topicHub?.enabled).toBe(false);
    expect(lean.credentials?.enabled).toBeUndefined();
  });

  it("stari dokument bez sekcije: `lean` daje odsustvo, hidracija ga ne izmišlja", async () => {
    // Dokument upisan pre nego što su ova polja ušla u šemu.
    const _id = new Types.ObjectId();
    await SalonProfile.collection.insertOne({
      _id,
      tenantId: new Types.ObjectId(),
      name: "Stari zapis",
      email: "stari@example.com",
      landingStructure: { landing: { hero: { enabled: true, headline: "Staro" } } },
    } as never);

    const { lean, hydrated } = await readAllWays(_id);
    // Cela sekcija ne postoji…
    expect(lean.audiencePaths).toBeUndefined();
    // …a hidracija, koja objekat rekonstruiše, više ne dopisuje `false`.
    expect(hydrated.audiencePaths?.enabled).toBeUndefined();
  });
});
