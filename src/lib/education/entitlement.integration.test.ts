import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_TWELVE_BLOCKS } from "./__fixtures__/education-blocks";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));
vi.mock("@/lib/platform/capabilities-server", () => ({
  resolveTenantCapability: async () => ({ enabled: true }),
  requireCapability: async () => null,
}));

import { ClientContentAssignment } from "@/models/ClientContentAssignment";
import { EducationContent } from "@/models/EducationContent";
import {
  listAssignedEducationContent,
  readAssignedEducationContent,
} from "./entitlement";

const TENANT = new Types.ObjectId().toString();
const OTHER_TENANT = new Types.ObjectId().toString();
const CLIENT = new Types.ObjectId().toString();
const OTHER_CLIENT = new Types.ObjectId().toString();

let replSet: MongoMemoryReplSet;
let contentId: string;

async function createPrivateContent(tenantId = TENANT) {
  const created = await EducationContent.create({
    tenantId,
    title: "Plan nakon konsultacije",
    slug: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "guide",
    accessMode: "private",
    status: "published",
    blocks: ALL_TWELVE_BLOCKS,
    publishedSnapshot: {
      title: "Plan nakon konsultacije",
      slug: "plan-nakon-konsultacije",
      kind: "guide",
      accessMode: "private",
      blocks: ALL_TWELVE_BLOCKS,
      publishedAt: new Date(),
    },
  });
  return String(created._id);
}

async function assign(clientProfileId: string, educationContentId = contentId) {
  await ClientContentAssignment.create({
    tenantId: TENANT,
    clientProfileId,
    educationContentId,
    status: "active",
  });
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri(), { dbName: "entitlement-test" });
  await Promise.all([
    EducationContent.syncIndexes(),
    ClientContentAssignment.syncIndexes(),
  ]);
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  await Promise.all([
    EducationContent.deleteMany({}),
    ClientContentAssignment.deleteMany({}),
  ]);
  contentId = await createPrivateContent();
});

describe("bez dodele nema pristupa", () => {
  it("klijentkinja bez dodele ne vidi sadržaj ni u listi ni na direktnoj adresi", async () => {
    expect(await listAssignedEducationContent(TENANT, CLIENT)).toEqual([]);
    expect(
      await readAssignedEducationContent(TENANT, CLIENT, contentId),
    ).toBeNull();
  });

  it("prijavljenost sama po sebi nije pravo pristupa", async () => {
    // Uslov nikad nije „ulogovan je", nego „ovoj klijentkinji je ovaj sadržaj
    // dodeljen i dodela je aktivna".
    await assign(OTHER_CLIENT);

    expect(
      await readAssignedEducationContent(TENANT, CLIENT, contentId),
    ).toBeNull();
    expect(await listAssignedEducationContent(TENANT, CLIENT)).toEqual([]);
  });
});

describe("sa dodelom", () => {
  beforeEach(async () => assign(CLIENT));

  it("sadržaj se pojavljuje u listi „Moji sadržaji“", async () => {
    const items = await listAssignedEducationContent(TENANT, CLIENT);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: contentId,
      title: "Plan nakon konsultacije",
      accessMode: "private",
    });
    // Lista nikad ne nosi telo — ni greška u prikazu ne može da ga otkrije.
    expect(items[0]).not.toHaveProperty("blocks");
  });

  it("čitanje vraća objavljenu verziju sa telom", async () => {
    const article = await readAssignedEducationContent(TENANT, CLIENT, contentId);

    expect(article?.blocks).toEqual(ALL_TWELVE_BLOCKS);
  });

  it("služi se OBJAVLJENA verzija, ne radna kopija", async () => {
    await EducationContent.updateOne(
      { _id: contentId },
      { $set: { title: "Radna izmena", blocks: [] } },
    );

    const article = await readAssignedEducationContent(TENANT, CLIENT, contentId);

    expect(article?.title).toBe("Plan nakon konsultacije");
    expect(article?.blocks).toHaveLength(12);
  });
});

describe("granice", () => {
  it("druga klijentkinja ne vidi ništa", async () => {
    await assign(CLIENT);

    expect(await listAssignedEducationContent(TENANT, OTHER_CLIENT)).toEqual([]);
    expect(
      await readAssignedEducationContent(TENANT, OTHER_CLIENT, contentId),
    ).toBeNull();
  });

  it("dodela ne prelazi granicu tenanta", async () => {
    await assign(CLIENT);

    expect(
      await listAssignedEducationContent(OTHER_TENANT, CLIENT),
    ).toEqual([]);
    expect(
      await readAssignedEducationContent(OTHER_TENANT, CLIENT, contentId),
    ).toBeNull();
  });

  it("povlačenje pristupa gasi i listu i direktnu adresu", async () => {
    await assign(CLIENT);
    expect(await listAssignedEducationContent(TENANT, CLIENT)).toHaveLength(1);

    await ClientContentAssignment.updateOne(
      { tenantId: TENANT, clientProfileId: CLIENT, educationContentId: contentId },
      { $set: { status: "revoked", revokedAt: new Date() } },
    );

    // Stara adresa koja je nekome ostala u istoriji pregledača prestaje da radi.
    expect(await listAssignedEducationContent(TENANT, CLIENT)).toEqual([]);
    expect(
      await readAssignedEducationContent(TENANT, CLIENT, contentId),
    ).toBeNull();
  });

  it("neobjavljen sadržaj se ne služi ni dodeljenoj klijentkinji", async () => {
    const draft = await EducationContent.create({
      tenantId: TENANT,
      title: "Još nije gotovo",
      slug: "jos-nije-gotovo",
      kind: "article",
      accessMode: "private",
      blocks: ALL_TWELVE_BLOCKS,
    });
    await assign(CLIENT, String(draft._id));

    expect(
      await readAssignedEducationContent(TENANT, CLIENT, String(draft._id)),
    ).toBeNull();
    expect(await listAssignedEducationContent(TENANT, CLIENT)).toEqual([]);
  });

  it("neispravan identifikator ne ruši proveru", async () => {
    expect(
      await readAssignedEducationContent(TENANT, CLIENT, "nije-objectid"),
    ).toBeNull();
    expect(
      await listAssignedEducationContent(TENANT, "nije-objectid"),
    ).toEqual([]);
  });
});
