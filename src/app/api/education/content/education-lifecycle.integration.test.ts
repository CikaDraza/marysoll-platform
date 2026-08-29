import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_TWELVE_BLOCKS } from "@/lib/education/__fixtures__/education-blocks";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));
vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn() }));
vi.mock("@/lib/platform/capabilities-server", () => ({
  requireCapability: async () => null,
}));

import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { EducationContent } from "@/models/EducationContent";
import { POST as createContent } from "./route";
import { GET as getContent, PATCH as saveContent } from "./[id]/route";
import { POST as publishContent } from "./[id]/publish/route";

const TENANT = new Types.ObjectId().toString();
const OTHER_TENANT = new Types.ObjectId().toString();

let replSet: MongoMemoryReplSet;

function request(body?: unknown) {
  return new Request("https://admin.marysoll.com/api/education/content", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function json<T = Record<string, never>>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type Item = {
  _id: string;
  title: string;
  slug: string;
  visibility: string;
  status: string;
  blocks: unknown[];
  publishedSnapshot: {
    title: string;
    slug: string;
    kind: string;
    visibility: string;
    blocks?: unknown[];
    publishedAt: string;
  } | null;
};

/** V1 radna kopija: naslov, slug, javna, sa svih 12 blokova. */
async function createPublishedV1() {
  const created = await json<{ item: Item }>(
    await createContent(
      request({
        title: "Estetika lica",
        slug: "estetika-lica",
        kind: "article",
        visibility: "public",
        blocks: ALL_TWELVE_BLOCKS,
      }),
    ),
  );
  const id = String(created.item._id);
  const published = await publishContent(request(), params(id));
  expect(published.status).toBe(200);
  return id;
}

async function readRaw(id: string) {
  return EducationContent.findById(id).lean() as unknown as Promise<Item>;
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri(), { dbName: "education-lifecycle-test" });
  await EducationContent.syncIndexes();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  await EducationContent.deleteMany({});
  vi.mocked(requireTenantAdmin).mockReturnValue({
    success: true,
    tenantId: TENANT,
  });
});

describe("A — prva objava", () => {
  it("draft nema snapshot; objava ga kreira i podiže status", async () => {
    const created = await json<{ item: Item }>(
      await createContent(
        request({
          title: "Estetika lica",
          kind: "article",
          visibility: "public",
          blocks: ALL_TWELVE_BLOCKS,
        }),
      ),
    );
    const id = String(created.item._id);

    expect(created.item.status).toBe("draft");
    expect(created.item.publishedSnapshot).toBeNull();

    await publishContent(request(), params(id));
    const record = await readRaw(id);

    expect(record.status).toBe("published");
    expect(record.publishedSnapshot).toMatchObject({
      title: "Estetika lica",
      slug: "estetika-lica",
      visibility: "public",
    });
    expect(record.publishedSnapshot?.publishedAt).toBeTruthy();
  });
});

describe("B — čuvanje posle objave NE menja živu verziju", () => {
  it("radna kopija ide u V2, snapshot ostaje V1, status ostaje published", async () => {
    const id = await createPublishedV1();

    const saved = await saveContent(
      request({
        title: "Proporcije lica",
        slug: "proporcije-lica",
        kind: "guide",
        visibility: "private",
        seo: { title: "Novi SEO" },
        blocks: ALL_TWELVE_BLOCKS.slice(0, 3),
      }),
      params(id),
    );
    expect(saved.status).toBe(200);

    const record = await readRaw(id);

    // Radna kopija je V2…
    expect(record.title).toBe("Proporcije lica");
    expect(record.slug).toBe("proporcije-lica");
    expect(record.visibility).toBe("private");
    expect(record.blocks).toHaveLength(3);

    // …a živa verzija je i dalje V1.
    expect(record.status).toBe("published");
    expect(record.publishedSnapshot).toMatchObject({
      title: "Estetika lica",
      slug: "estetika-lica",
      kind: "article",
      visibility: "public",
    });
    expect(record.publishedSnapshot?.blocks).toHaveLength(12);
  });

  it("admin GET vraća radnu kopiju i metapodatke objave, bez objavljenih blokova", async () => {
    const id = await createPublishedV1();
    await saveContent(request({ title: "Proporcije lica" }), params(id));

    const item = (await json<{ item: Item }>(
      await getContent(request(), params(id)),
    )).item;

    expect(item.title).toBe("Proporcije lica");
    expect(item.publishedSnapshot?.title).toBe("Estetika lica");
    expect(item.publishedSnapshot).not.toHaveProperty("blocks");
  });
});

describe("C — ponovna objava", () => {
  it("promoviše tekuću radnu kopiju u novi snapshot", async () => {
    const id = await createPublishedV1();
    const first = await readRaw(id);

    await saveContent(
      request({ title: "Estetika lica — dopuna", blocks: ALL_TWELVE_BLOCKS.slice(0, 4) }),
      params(id),
    );
    await publishContent(request(), params(id));

    const record = await readRaw(id);

    expect(record.publishedSnapshot).toMatchObject({
      title: "Estetika lica — dopuna",
    });
    expect(record.publishedSnapshot?.blocks).toHaveLength(4);
    expect(
      new Date(record.publishedSnapshot!.publishedAt).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(first.publishedSnapshot!.publishedAt).getTime(),
    );
  });
});

describe("D — vidljivost", () => {
  it("prelazak na privatno stupa na snagu tek objavom", async () => {
    const id = await createPublishedV1();

    await saveContent(request({ visibility: "private" }), params(id));
    expect((await readRaw(id)).publishedSnapshot?.visibility).toBe("public");

    await publishContent(request(), params(id));
    expect((await readRaw(id)).publishedSnapshot?.visibility).toBe("private");
  });

  it("prelazak nazad na javno takođe traži objavu", async () => {
    const id = await createPublishedV1();
    await saveContent(request({ visibility: "private" }), params(id));
    await publishContent(request(), params(id));

    await saveContent(request({ visibility: "public" }), params(id));
    expect((await readRaw(id)).publishedSnapshot?.visibility).toBe("private");

    await publishContent(request(), params(id));
    expect((await readRaw(id)).publishedSnapshot?.visibility).toBe("public");
  });
});

describe("E — slug", () => {
  it("javni URL se ne menja dok se ponovo ne objavi", async () => {
    const id = await createPublishedV1();

    await saveContent(request({ slug: "proporcije-lica" }), params(id));
    let record = await readRaw(id);
    expect(record.slug).toBe("proporcije-lica");
    expect(record.publishedSnapshot?.slug).toBe("estetika-lica");

    await publishContent(request(), params(id));
    record = await readRaw(id);
    expect(record.publishedSnapshot?.slug).toBe("proporcije-lica");
  });

  it("dva objavljena zapisa istog tenanta ne mogu deliti javni URL", async () => {
    const first = await createPublishedV1();
    // Prvi oslobađa radni slug, ali njegov JAVNI URL i dalje živi.
    await saveContent(request({ slug: "proporcije-lica" }), params(first));

    const second = await json<{ item: Item }>(
      await createContent(
        request({
          title: "Drugi tekst",
          slug: "estetika-lica",
          kind: "article",
          visibility: "public",
          blocks: ALL_TWELVE_BLOCKS,
        }),
      ),
    );

    const conflict = await publishContent(
      request(),
      params(String(second.item._id)),
    );

    expect(conflict.status).toBe(409);
    expect(await json(conflict)).toMatchObject({
      code: "EDUCATION_PUBLIC_SLUG_TAKEN",
    });
    expect((await readRaw(String(second.item._id))).publishedSnapshot).toBeNull();
  });
});

describe("F — sadržaj", () => {
  it("svih 12 blokova preživi kopiju u snapshot netaknuto", async () => {
    const id = await createPublishedV1();
    const record = await readRaw(id);

    expect(record.publishedSnapshot?.blocks).toEqual(ALL_TWELVE_BLOCKS);
  });
});

describe("G — validacija", () => {
  it("nepotpun draft se čuva, ali se ne objavljuje, i snapshot ostaje netaknut", async () => {
    const id = await createPublishedV1();

    const incomplete = await saveContent(
      request({
        blocks: [
          { id: "a", type: "ArticleBlock", priority: 1, title: "", paragraphs: [] },
        ],
      }),
      params(id),
    );
    expect(incomplete.status).toBe(200);

    const publish = await publishContent(request(), params(id));
    expect(publish.status).toBe(422);

    const record = await readRaw(id);
    expect(record.publishedSnapshot?.blocks).toHaveLength(12);
    expect(record.publishedSnapshot?.title).toBe("Estetika lica");
  });

  it("strukturno neispravan draft se ne čuva", async () => {
    const id = await createPublishedV1();

    const response = await saveContent(
      request({ blocks: [{ id: "x", type: "NepoznatBlok" }] }),
      params(id),
    );

    expect(response.status).toBe(422);
    expect((await readRaw(id)).blocks).toHaveLength(12);
  });
});

describe("H — tenant scope", () => {
  it("tuđi tenant ne može ni da pročita, ni da sačuva, ni da objavi", async () => {
    const id = await createPublishedV1();

    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: true,
      tenantId: OTHER_TENANT,
    });

    expect((await getContent(request(), params(id))).status).toBe(404);
    expect(
      (await saveContent(request({ title: "Otmica" }), params(id))).status,
    ).toBe(404);
    expect((await publishContent(request(), params(id))).status).toBe(404);

    const record = await readRaw(id);
    expect(record.title).toBe("Estetika lica");
    expect(record.publishedSnapshot?.title).toBe("Estetika lica");
  });

  it("isti javni slug kod dva različita tenanta je dozvoljen", async () => {
    await createPublishedV1();

    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: true,
      tenantId: OTHER_TENANT,
    });

    const other = await json<{ item: Item }>(
      await createContent(
        request({
          title: "Estetika lica",
          slug: "estetika-lica",
          kind: "article",
          visibility: "public",
          blocks: ALL_TWELVE_BLOCKS,
        }),
      ),
    );

    const response = await publishContent(
      request(),
      params(String(other.item._id)),
    );

    expect(response.status).toBe(200);
  });
});
