import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ALL_TWELVE_BLOCKS } from "@/lib/education/__fixtures__/education-blocks";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn() }));
vi.mock("@/lib/platform/capabilities-server", () => ({
  requireCapability: vi.fn(),
}));
vi.mock("@/lib/education/taxonomy-server", () => ({
  validateEducationClassificationForTenant: vi.fn(async () => ({
    ok: true,
    taxonomy: null,
  })),
}));
vi.mock("@/models/EducationContent", async () => {
  const actual = await vi.importActual<
    typeof import("@/models/EducationContent")
  >("@/models/EducationContent");
  return {
    ...actual,
    EducationContent: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
  };
});

/** Publish čita radnu kopiju, pa zasebno proverava koliziju javnog slug-a. */
function chain(value: unknown) {
  const node = { select: () => node, lean: async () => value };
  return node as never;
}

import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { EducationContent } from "@/models/EducationContent";
import { POST } from "./route";

const TENANT = "6650a1f1a1f1a1f1a1f1a1f1";
const ID = "6650b2b2b2b2b2b2b2b2b2b2";

const params = { params: Promise.resolve({ id: ID }) };

function request(body?: unknown) {
  return new Request(
    `https://admin.marysoll.com/api/education/content/${ID}/publish`,
    {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
}

function persisted(blocks: unknown, liveCollision: unknown = null) {
  vi.mocked(EducationContent.findOne).mockImplementation(
    // Provera kolizije javne adrese gleda i tekuće slugove i istoriju, pa se
    // prepoznaje po `$or`, ne po jednom polju.
    ((filter: Record<string, unknown>) =>
      "$or" in filter
        ? chain(liveCollision)
        : chain({
            _id: ID,
            title: "Estetika lica",
            slug: "estetika-lica",
            kind: "article",
            accessMode: "public",
            blocks,
            publishedSnapshot: null,
            publishedSlugHistory: [],
          })) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireTenantAdmin).mockReturnValue({
    success: true,
    tenantId: TENANT,
  });
  vi.mocked(requireCapability).mockResolvedValue(null);
  vi.mocked(EducationContent.findOneAndUpdate).mockReturnValue(
    chain({ _id: ID, status: "published" }),
  );
  persisted(ALL_TWELVE_BLOCKS);
});

describe("POST /api/education/content/[id]/publish", () => {
  it("objavljuje sačuvan sadržaj jednom tenant-scoped izmenom", async () => {
    const response = await POST(request(), params);

    expect(response.status).toBe(200);
    expect(EducationContent.findOne).toHaveBeenCalledWith({
      _id: ID,
      tenantId: TENANT,
    });
    const [filter, update] = vi.mocked(EducationContent.findOneAndUpdate).mock.calls[0];
    expect(filter).toEqual({ _id: ID, tenantId: TENANT });
    expect(update).toMatchObject({
      $set: {
        status: "published",
        // Snapshot se gradi isključivo od sačuvane radne kopije.
        publishedSnapshot: {
          title: "Estetika lica",
          slug: "estetika-lica",
          kind: "article",
          accessMode: "public",
          blocks: ALL_TWELVE_BLOCKS,
        },
      },
    });
    expect(EducationContent.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("odbija objavu kada drugi objavljen zapis već drži isti javni URL", async () => {
    persisted(ALL_TWELVE_BLOCKS, { _id: "drugi-zapis" });

    const response = await POST(request(), params);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "EDUCATION_PUBLIC_SLUG_TAKEN",
    });
    expect(EducationContent.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("ignoriše blokove iz tela zahteva — objavljuje se samo sačuvano stanje", async () => {
    persisted([]);

    const response = await POST(request({ blocks: ALL_TWELVE_BLOCKS }), params);

    expect(response.status).toBe(422);
    expect(EducationContent.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("odbija nepotpun sadržaj i ne menja status", async () => {
    persisted([
      { id: "a", type: "ArticleBlock", priority: 1, title: "", paragraphs: [] },
    ]);

    const response = await POST(request(), params);

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "CONTENT_VALIDATION_FAILED",
    });
    expect(EducationContent.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("odbija sadržaj bez ijednog vidljivog kompletnog bloka", async () => {
    persisted([{ ...ALL_TWELVE_BLOCKS[1], visibility: "hidden" }]);

    const response = await POST(request(), params);
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.validation.issues[0].message).toMatch(
      /vidljiv i kompletan blok/,
    );
    expect(EducationContent.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("odbija prazan sadržaj", async () => {
    persisted([]);

    expect((await POST(request(), params)).status).toBe(422);
    expect(EducationContent.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("odbija klijenta i tenant bez capability-ja pre čitanja zapisa", async () => {
    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    expect((await POST(request(), params)).status).toBe(403);

    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: true,
      tenantId: TENANT,
    });
    vi.mocked(requireCapability).mockResolvedValue(
      NextResponse.json({ code: "CAPABILITY_NOT_ENABLED" }, { status: 403 }),
    );
    expect((await POST(request(), params)).status).toBe(403);
    expect(EducationContent.findOne).not.toHaveBeenCalled();
  });

  it("vraća 404 za tuđi ili nepostojeći zapis", async () => {
    vi.mocked(EducationContent.findOne).mockReturnValue(chain(null));

    expect((await POST(request(), params)).status).toBe(404);
    expect(EducationContent.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
