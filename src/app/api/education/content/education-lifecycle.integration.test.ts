import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_TWELVE_BLOCKS } from "@/lib/education/__fixtures__/education-blocks";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));
vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn() }));
vi.mock("@/lib/platform/capabilities-server", () => ({
  requireCapability: async () => null,
  resolveTenantCapability: async () => ({ enabled: true }),
}));

import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { normalizeEducationContentRecord } from "@/hooks/education/useEducationContent";
import {
  editorStateFromRecord,
  educationPublicationStateFromRecord,
  isEducationEditorDirty,
  publicationLabel,
} from "@/components/education/education-content-editor-model";
import { EducationContent } from "@/models/EducationContent";
import { POST as createContent } from "./route";
import { GET as getContent, PATCH as saveContent } from "./[id]/route";
import { POST as publishContent } from "./[id]/publish/route";
import {
  getPublicEducationContent,
  listPublicEducationContent,
  resolvePublicEducationRoute,
} from "@/lib/education/publicContent";

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
  accessMode: string;
  status: string;
  blocks: unknown[];
  publishedSnapshot: {
    title: string;
    slug: string;
    kind: string;
    accessMode: string;
    blocks?: unknown[];
    publishedAt: string;
  } | null;
  publishedSlugHistory?: string[];
};

/** V1 radna kopija: naslov, slug, javna, sa svih 12 blokova. */
async function createPublishedV1() {
  const created = await json<{ item: Item }>(
    await createContent(
      request({
        title: "Estetika lica",
        slug: "estetika-lica",
        kind: "article",
        accessMode: "public",
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
          accessMode: "public",
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
      accessMode: "public",
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
        accessMode: "private",
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
    expect(record.accessMode).toBe("private");
    expect(record.blocks).toHaveLength(3);

    // …a živa verzija je i dalje V1.
    expect(record.status).toBe("published");
    expect(record.publishedSnapshot).toMatchObject({
      title: "Estetika lica",
      slug: "estetika-lica",
      kind: "article",
      accessMode: "public",
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

    await saveContent(request({ accessMode: "private" }), params(id));
    expect((await readRaw(id)).publishedSnapshot?.accessMode).toBe("public");

    await publishContent(request(), params(id));
    expect((await readRaw(id)).publishedSnapshot?.accessMode).toBe("private");
  });

  it("prelazak nazad na javno takođe traži objavu", async () => {
    const id = await createPublishedV1();
    await saveContent(request({ accessMode: "private" }), params(id));
    await publishContent(request(), params(id));

    await saveContent(request({ accessMode: "public" }), params(id));
    expect((await readRaw(id)).publishedSnapshot?.accessMode).toBe("private");

    await publishContent(request(), params(id));
    expect((await readRaw(id)).publishedSnapshot?.accessMode).toBe("public");
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
          accessMode: "public",
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
          accessMode: "public",
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

describe("I — refresh ne gubi ništa (server → editor)", () => {
  /**
   * Šav koji nijedan serverski test ne pokriva: odgovor rute prolazi kroz
   * normalizaciju hook-a i punjenje editor stanja. Greška ovde tiho gubi
   * sadržaj koji je server ispravno sačuvao.
   */
  it("stanje editora posle ponovnog učitavanja jednako je onome što je sačuvano", async () => {
    const sent = {
      title: "Estetika lica",
      slug: "estetika-lica",
      kind: "guide" as const,
      accessMode: "private" as const,
      blocks: ALL_TWELVE_BLOCKS,
      seo: { title: "Estetika lica", description: "Šta stvarno pomaže koži" },
    };

    const created = await json<{ item: Item }>(
      await createContent(request(sent)),
    );
    const id = String(created.item._id);

    // Ovo je doslovno ono što se dogodi na F5: GET → normalizacija → editor.
    const reloaded = (await json<{ item: Record<string, unknown> }>(
      await getContent(request(), params(id)),
    )).item;
    const state = editorStateFromRecord(
      normalizeEducationContentRecord(reloaded),
    );

    expect(state.title).toBe(sent.title);
    expect(state.slug).toBe(sent.slug);
    expect(state.kind).toBe(sent.kind);
    expect(state.accessMode).toBe(sent.accessMode);
    expect(state.seo).toEqual(sent.seo);
    expect(state.blocks).toEqual(ALL_TWELVE_BLOCKS);
    // Ponovo učitan zapis nije „prljav“ dok ga vlasnica ne dotakne.
    expect(isEducationEditorDirty(state, state)).toBe(false);
  });

  it("oznaka objave prati stvarno stanje kroz ceo ciklus", async () => {
    const id = await createPublishedV1();

    const afterPublish = normalizeEducationContentRecord(
      (await json<{ item: Record<string, unknown> }>(
        await getContent(request(), params(id)),
      )).item,
    );
    expect(
      publicationLabel(educationPublicationStateFromRecord(afterPublish)),
    ).toBe("Objavljeno");

    await saveContent(request({ title: "Estetika lica — dopuna" }), params(id));
    const afterSave = normalizeEducationContentRecord(
      (await json<{ item: Record<string, unknown> }>(
        await getContent(request(), params(id)),
      )).item,
    );
    expect(
      publicationLabel(educationPublicationStateFromRecord(afterSave)),
    ).toBe("Objavljeno · neobjavljene izmene");

    await publishContent(request(), params(id));
    const afterRepublish = normalizeEducationContentRecord(
      (await json<{ item: Record<string, unknown> }>(
        await getContent(request(), params(id)),
      )).item,
    );
    expect(
      publicationLabel(educationPublicationStateFromRecord(afterRepublish)),
    ).toBe("Objavljeno");
  });
});

describe("J — javno čitanje (UI-3A.1)", () => {
  it("objavljen javan sadržaj je u listi i na svom slug-u", async () => {
    await createPublishedV1();

    const list = await listPublicEducationContent(TENANT);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      slug: "estetika-lica",
      title: "Estetika lica",
      kind: "article",
    });

    const article = await getPublicEducationContent(TENANT, "estetika-lica");
    expect(article?.blocks).toEqual(ALL_TWELVE_BLOCKS);
  });

  it("neobjavljen draft nije javan", async () => {
    await createContent(
      request({
        title: "Još nije gotovo",
        slug: "jos-nije-gotovo",
        kind: "article",
        accessMode: "public",
        blocks: ALL_TWELVE_BLOCKS,
      }),
    );

    expect(await listPublicEducationContent(TENANT)).toEqual([]);
    expect(await getPublicEducationContent(TENANT, "jos-nije-gotovo")).toBeNull();
  });

  it("objavljen privatan sadržaj nije javan ni u listi ni na slug-u", async () => {
    const id = await createPublishedV1();
    await saveContent(request({ accessMode: "private" }), params(id));
    await publishContent(request(), params(id));

    expect(await listPublicEducationContent(TENANT)).toEqual([]);
    expect(await getPublicEducationContent(TENANT, "estetika-lica")).toBeNull();
  });

  it("javna adresa prati objavljenu verziju, ne radnu kopiju", async () => {
    const id = await createPublishedV1();
    await saveContent(
      request({ slug: "proporcije-lica", title: "Proporcije lica" }),
      params(id),
    );

    // Sačuvano ali neobjavljeno: stari URL i dalje radi, novi još ne postoji.
    expect(await getPublicEducationContent(TENANT, "proporcije-lica")).toBeNull();
    const live = await getPublicEducationContent(TENANT, "estetika-lica");
    expect(live?.title).toBe("Estetika lica");

    await publishContent(request(), params(id));
    expect(await getPublicEducationContent(TENANT, "estetika-lica")).toBeNull();
    expect(
      (await getPublicEducationContent(TENANT, "proporcije-lica"))?.title,
    ).toBe("Proporcije lica");
  });

  it("ne prelazi granicu tenanta", async () => {
    await createPublishedV1();

    expect(await listPublicEducationContent(OTHER_TENANT)).toEqual([]);
    expect(
      await getPublicEducationContent(OTHER_TENANT, "estetika-lica"),
    ).toBeNull();
  });

  it("zatečen zapis bez objavljene verzije nije javan ni kad je status published", async () => {
    const created = await json<{ item: Item }>(
      await createContent(
        request({
          title: "Legacy",
          slug: "legacy",
          kind: "article",
          accessMode: "public",
          blocks: ALL_TWELVE_BLOCKS,
        }),
      ),
    );
    // Stanje pre UI-2B: status published, bez snapshot-a.
    await EducationContent.updateOne(
      { _id: created.item._id },
      { $set: { status: "published" } },
    );

    expect(await listPublicEducationContent(TENANT)).toEqual([]);
    expect(await getPublicEducationContent(TENANT, "legacy")).toBeNull();
  });
});

describe("K — istorija javnih adresa (UI-3A.2)", () => {
  /** Objavi V1, pa preimenuj i ponovo objavi. Vraća oba slug-a. */
  async function renameAndRepublish(id: string, nextSlug: string) {
    await saveContent(request({ slug: nextSlug }), params(id));
    const response = await publishContent(request(), params(id));
    expect(response.status).toBe(200);
  }

  it("draft promena slug-a ne pravi preusmerenje niti ruši živu adresu", async () => {
    const id = await createPublishedV1();
    await saveContent(request({ slug: "proporcije-lica" }), params(id));

    // Sačuvano, ali neobjavljeno: nova adresa ne postoji ni kao sadržaj ni kao
    // alias, a stara i dalje služi sadržaj.
    expect(
      await resolvePublicEducationRoute(TENANT, "proporcije-lica"),
    ).toEqual({ kind: "not-found" });
    expect(
      (await resolvePublicEducationRoute(TENANT, "estetika-lica")).kind,
    ).toBe("article");
    expect((await readRaw(id)).publishedSlugHistory ?? []).toEqual([]);
  });

  it("posle objave novog slug-a stari vraća preusmerenje na kanonski", async () => {
    const id = await createPublishedV1();
    await renameAndRepublish(id, "proporcije-lica");

    const canonical = await resolvePublicEducationRoute(TENANT, "proporcije-lica");
    expect(canonical.kind).toBe("article");

    expect(await resolvePublicEducationRoute(TENANT, "estetika-lica")).toEqual({
      kind: "redirect",
      slug: "proporcije-lica",
    });
    expect((await readRaw(id)).publishedSlugHistory).toEqual(["estetika-lica"]);
  });

  it("lanac preimenovanja čuva sve ranije javne adrese", async () => {
    const id = await createPublishedV1();
    await renameAndRepublish(id, "proporcije-lica");
    await renameAndRepublish(id, "analiza-lica");

    for (const old of ["estetika-lica", "proporcije-lica"]) {
      expect(await resolvePublicEducationRoute(TENANT, old)).toEqual({
        kind: "redirect",
        slug: "analiza-lica",
      });
    }
  });

  it("povratak na staru adresu je uklanja iz istorije", async () => {
    const id = await createPublishedV1();
    await renameAndRepublish(id, "proporcije-lica");
    await renameAndRepublish(id, "estetika-lica");

    const record = await readRaw(id);
    expect(record.publishedSnapshot?.slug).toBe("estetika-lica");
    expect(record.publishedSlugHistory).toEqual(["proporcije-lica"]);
    expect(
      (await resolvePublicEducationRoute(TENANT, "estetika-lica")).kind,
    ).toBe("article");
  });

  it("prelazak u privatno gasi i staru adresu — bez preusmerenja i bez signala", async () => {
    const id = await createPublishedV1();
    await renameAndRepublish(id, "proporcije-lica");

    await saveContent(request({ accessMode: "private" }), params(id));
    await publishContent(request(), params(id));

    // Ni kanonska ni istorijska adresa ne smeju priznati da zapis postoji.
    expect(await resolvePublicEducationRoute(TENANT, "proporcije-lica")).toEqual({
      kind: "not-found",
    });
    expect(await resolvePublicEducationRoute(TENANT, "estetika-lica")).toEqual({
      kind: "not-found",
    });
  });

  it("privatan sadržaj se ne može otkriti kroz istoriju adresa", async () => {
    const id = await createPublishedV1();
    await saveContent(
      request({ accessMode: "private", slug: "tajni-plan" }),
      params(id),
    );
    await publishContent(request(), params(id));

    // Ugovor zabranjuje OTKRIVANJE kroz istoriju, ne čuvanje: zapis sme držati
    // svoju raniju javnu adresu, ali je resolver ne sme razrešiti dok je
    // tekuća objavljena verzija privatna.
    expect(await resolvePublicEducationRoute(TENANT, "estetika-lica")).toEqual({
      kind: "not-found",
    });
    expect(await resolvePublicEducationRoute(TENANT, "tajni-plan")).toEqual({
      kind: "not-found",
    });
    expect(await getPublicEducationContent(TENANT, "estetika-lica")).toBeNull();
    expect(await listPublicEducationContent(TENANT)).toEqual([]);
  });

  it("povratak iz privatnog u javno oživljava i staru adresu", async () => {
    const id = await createPublishedV1();
    await saveContent(
      request({ accessMode: "private", slug: "tajni-plan" }),
      params(id),
    );
    await publishContent(request(), params(id));
    expect(await resolvePublicEducationRoute(TENANT, "estetika-lica")).toEqual({
      kind: "not-found",
    });

    await saveContent(request({ accessMode: "public" }), params(id));
    await publishContent(request(), params(id));

    // Zato se istorija i čuva kroz privatan period: ranije podeljeni linkovi
    // nastavljaju da rade kad se sadržaj vrati u javno.
    expect(await resolvePublicEducationRoute(TENANT, "estetika-lica")).toEqual({
      kind: "redirect",
      slug: "tajni-plan",
    });
  });

  it("brisanje ne ostavlja preusmerenje koje otkriva obrisan sadržaj", async () => {
    const id = await createPublishedV1();
    await renameAndRepublish(id, "proporcije-lica");
    await EducationContent.deleteOne({ _id: id });

    expect(await resolvePublicEducationRoute(TENANT, "estetika-lica")).toEqual({
      kind: "not-found",
    });
    expect(await resolvePublicEducationRoute(TENANT, "proporcije-lica")).toEqual({
      kind: "not-found",
    });
  });

  it("alias ne prelazi granicu tenanta", async () => {
    const id = await createPublishedV1();
    await renameAndRepublish(id, "proporcije-lica");

    expect(
      await resolvePublicEducationRoute(OTHER_TENANT, "estetika-lica"),
    ).toEqual({ kind: "not-found" });
    expect(
      await resolvePublicEducationRoute(OTHER_TENANT, "proporcije-lica"),
    ).toEqual({ kind: "not-found" });
  });

  it("drugi zapis ne može preuzeti tuđu staru javnu adresu", async () => {
    const first = await createPublishedV1();
    await renameAndRepublish(first, "proporcije-lica");

    const second = await json<{ item: Item }>(
      await createContent(
        request({
          title: "Drugi tekst",
          slug: "estetika-lica",
          kind: "article",
          accessMode: "public",
          blocks: ALL_TWELVE_BLOCKS,
        }),
      ),
    );
    const conflict = await publishContent(
      request(),
      params(String(second.item._id)),
    );

    expect(conflict.status).toBe(409);
    // Stara adresa i dalje vodi na prvi zapis, ne na uljeza.
    expect(await resolvePublicEducationRoute(TENANT, "estetika-lica")).toEqual({
      kind: "redirect",
      slug: "proporcije-lica",
    });
  });
});

describe("L — zaključan sadržaj (gated)", () => {
  async function publishGated(preview?: Record<string, string>) {
    const created = await json<{ item: Item }>(
      await createContent(
        request({
          title: "Napredna analiza sastojaka",
          slug: "napredna-analiza",
          kind: "guide",
          accessMode: "gated",
          publicPreview: preview,
          blocks: ALL_TWELVE_BLOCKS,
          seo: { description: "SEO opis", ogImage: "https://cdn.example.com/seo.jpg" },
        }),
      ),
    );
    const id = String(created.item._id);
    expect((await publishContent(request(), params(id))).status).toBe(200);
    return id;
  }

  it("javno je otkriven i stoji u listi", async () => {
    await publishGated({ description: "Šta ćete naučiti" });

    const list = await listPublicEducationContent(TENANT);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      slug: "napredna-analiza",
      accessMode: "gated",
      description: "Šta ćete naučiti",
    });
  });

  it("telo NIKADA ne napušta server neautorizovanom čitaocu", async () => {
    await publishGated();

    const article = await getPublicEducationContent(TENANT, "napredna-analiza");
    expect(article?.accessMode).toBe("gated");
    expect(article?.blocks).toEqual([]);

    // Ni jedan jedini fragment teksta iz blokova ne sme biti u odgovoru.
    expect(JSON.stringify(article)).not.toContain("Koža reaguje sporije");
    expect(JSON.stringify(article)).not.toContain("cdn.example.com/vodic.pdf");
  });

  it("javni pregled se izvodi iz naslova i SEO-a kada nije unet", async () => {
    await publishGated();

    const article = await getPublicEducationContent(TENANT, "napredna-analiza");
    expect(article).toMatchObject({
      title: "Napredna analiza sastojaka",
      description: "SEO opis",
      coverImage: "https://cdn.example.com/seo.jpg",
    });
  });

  it("prelazak javno → zaključano stupa na snagu tek objavom", async () => {
    const id = await createPublishedV1();
    await saveContent(request({ accessMode: "gated" }), params(id));

    // Živa verzija je i dalje javna, sa celim telom.
    expect(
      (await getPublicEducationContent(TENANT, "estetika-lica"))?.blocks,
    ).toHaveLength(12);

    await publishContent(request(), params(id));
    const gated = await getPublicEducationContent(TENANT, "estetika-lica");
    expect(gated?.accessMode).toBe("gated");
    expect(gated?.blocks).toEqual([]);
  });

  it("zaključana adresa preživljava preimenovanje kao i javna", async () => {
    const id = await publishGated();
    await saveContent(request({ slug: "analiza-sastojaka" }), params(id));
    await publishContent(request(), params(id));

    expect(await resolvePublicEducationRoute(TENANT, "napredna-analiza")).toEqual({
      kind: "redirect",
      slug: "analiza-sastojaka",
    });
  });

  it("prelazak zaključano → privatno gasi i adresu i listu", async () => {
    const id = await publishGated();
    await saveContent(request({ accessMode: "private" }), params(id));
    await publishContent(request(), params(id));

    expect(await listPublicEducationContent(TENANT)).toEqual([]);
    expect(
      await resolvePublicEducationRoute(TENANT, "napredna-analiza"),
    ).toEqual({ kind: "not-found" });
  });
});

describe("M — zatečeni zapisi bez accessMode", () => {
  it("staro `visibility: public` se čita kao javno, sve ostalo kao privatno", async () => {
    const id = await createPublishedV1();
    // Simulira zapis upisan pre migracije: bez `accessMode`, sa `visibility`.
    await EducationContent.updateOne(
      { _id: id },
      {
        $unset: { accessMode: "", "publishedSnapshot.accessMode": "" },
        $set: { visibility: "public", "publishedSnapshot.visibility": "public" },
      },
    );

    const article = await getPublicEducationContent(TENANT, "estetika-lica");
    expect(article?.accessMode).toBe("public");
    expect(article?.blocks).toHaveLength(12);

    await EducationContent.updateOne(
      { _id: id },
      { $set: { "publishedSnapshot.visibility": "private" } },
    );
    expect(await getPublicEducationContent(TENANT, "estetika-lica")).toBeNull();
    expect(await listPublicEducationContent(TENANT)).toEqual([]);
  });
});

describe("N — redosled čuvanja (C-followup)", () => {
  const order = (sessionId: string, revision: number) => ({
    sessionId,
    revision,
  });

  it("starije čuvanje ne može da pregazi novije iz iste sesije", async () => {
    const id = await createPublishedV1();

    // A2 stigne pre A1 — tačno ono što se dešava kad autosave i čuvanje pri
    // izlasku budu u letu istovremeno.
    const a2 = await saveContent(
      request({ title: "A2 — noviji tekst", saveOrder: order("s1", 2) }),
      params(id),
    );
    expect(a2.status).toBe(200);

    const a1 = await saveContent(
      request({ title: "A1 — stariji tekst", saveOrder: order("s1", 1) }),
      params(id),
    );

    expect(a1.status).toBe(200);
    expect(await json<{ stale?: boolean }>(a1)).toMatchObject({ stale: true });
    expect((await readRaw(id)).title).toBe("A2 — noviji tekst");
  });

  it("novo otvaranje editora uvek sme da piše", async () => {
    const id = await createPublishedV1();
    await saveContent(
      request({ title: "Iz prve sesije", saveOrder: order("s1", 9) }),
      params(id),
    );

    // Druga sesija počinje od 1, ali njeno stanje je po definiciji svežije.
    const second = await saveContent(
      request({ title: "Iz druge sesije", saveOrder: order("s2", 1) }),
      params(id),
    );

    expect(await json<{ stale?: boolean }>(second)).not.toMatchObject({
      stale: true,
    });
    expect((await readRaw(id)).title).toBe("Iz druge sesije");
  });

  it("čuvanje bez podataka o redosledu radi kao i pre", async () => {
    const id = await createPublishedV1();

    const response = await saveContent(
      request({ title: "Bez redosleda" }),
      params(id),
    );

    expect(response.status).toBe(200);
    expect((await readRaw(id)).title).toBe("Bez redosleda");
  });

  it("odbačeno čuvanje ne dira ni objavljenu verziju ni ostala polja", async () => {
    const id = await createPublishedV1();
    await saveContent(
      request({ title: "Novije", saveOrder: order("s1", 5) }),
      params(id),
    );

    await saveContent(
      request({
        title: "Starije",
        accessMode: "private",
        blocks: [],
        saveOrder: order("s1", 4),
      }),
      params(id),
    );

    const record = await readRaw(id);
    expect(record.title).toBe("Novije");
    expect(record.accessMode).toBe("public");
    expect(record.blocks).toHaveLength(12);
    expect(record.publishedSnapshot?.title).toBe("Estetika lica");
  });
});
