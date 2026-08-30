import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ALL_TWELVE_BLOCKS } from "@/lib/education/__fixtures__/education-blocks";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn() }));
vi.mock("@/lib/platform/capabilities-server", () => ({
  requireCapability: vi.fn(),
}));
vi.mock("@/models/EducationContent", async () => {
  const actual = await vi.importActual<
    typeof import("@/models/EducationContent")
  >("@/models/EducationContent");
  return {
    ...actual,
    EducationContent: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findOneAndDelete: vi.fn(),
    },
  };
});

import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { EducationContent } from "@/models/EducationContent";
import { DELETE, GET, PATCH } from "./route";

const TENANT = "6650a1f1a1f1a1f1a1f1a1f1";
const ID = "6650b2b2b2b2b2b2b2b2b2b2";

const params = (id = ID) => ({ params: Promise.resolve({ id }) });

function request(method: string, body?: unknown) {
  return new Request(`https://admin.marysoll.com/api/education/content/${ID}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function resolvesTo(value: unknown) {
  const chain = {
    select: () => chain,
    lean: async () => value,
  };
  return chain as never;
}

/** `$set` bez servisnog `workingSavedAt` pečata — on se proverava posebno. */
function persistedFields(call: number) {
  const update = vi.mocked(EducationContent.findOneAndUpdate).mock.calls[call][1] as {
    $set: Record<string, unknown>;
  };
  const { workingSavedAt, ...rest } = update.$set;
  expect(workingSavedAt).toBeInstanceOf(Date);
  return rest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireTenantAdmin).mockReturnValue({
    success: true,
    tenantId: TENANT,
  });
  vi.mocked(requireCapability).mockResolvedValue(null);
  vi.mocked(EducationContent.findOne).mockReturnValue(
    resolvesTo({ _id: ID, tenantId: TENANT, title: "Estetika lica" }),
  );
  vi.mocked(EducationContent.findOneAndUpdate).mockReturnValue(
    resolvesTo({ _id: ID, tenantId: TENANT, status: "draft" }),
  );
  vi.mocked(EducationContent.findOneAndDelete).mockReturnValue(
    resolvesTo({ _id: ID }),
  );
});

describe("tenant scoping", () => {
  it("svaka operacija filtrira i po _id i po tenantId", async () => {
    await GET(request("GET"), params());
    await PATCH(request("PATCH", { title: "Novi naslov" }), params());
    await DELETE(request("DELETE"), params());

    expect(EducationContent.findOne).toHaveBeenCalledWith({
      _id: ID,
      tenantId: TENANT,
    });
    expect(vi.mocked(EducationContent.findOneAndUpdate).mock.calls[0][0]).toEqual({
      _id: ID,
      tenantId: TENANT,
    });
    expect(EducationContent.findOneAndDelete).toHaveBeenCalledWith({
      _id: ID,
      tenantId: TENANT,
    });
  });

  it("tuđi tenant dobija 404, ne tuđi sadržaj", async () => {
    vi.mocked(EducationContent.findOne).mockReturnValue(resolvesTo(null));
    vi.mocked(EducationContent.findOneAndUpdate).mockReturnValue(resolvesTo(null));
    vi.mocked(EducationContent.findOneAndDelete).mockReturnValue(resolvesTo(null));

    expect((await GET(request("GET"), params())).status).toBe(404);
    expect(
      (await PATCH(request("PATCH", { title: "X" }), params())).status,
    ).toBe(404);
    expect((await DELETE(request("DELETE"), params())).status).toBe(404);
  });

  it("odbija klijenta i tenant bez capability-ja pre svake DB operacije", async () => {
    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    expect((await GET(request("GET"), params())).status).toBe(403);

    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: true,
      tenantId: TENANT,
    });
    vi.mocked(requireCapability).mockResolvedValue(
      NextResponse.json({ code: "CAPABILITY_NOT_ENABLED" }, { status: 403 }),
    );
    expect(
      (await PATCH(request("PATCH", { title: "X" }), params())).status,
    ).toBe(403);
    expect((await DELETE(request("DELETE"), params())).status).toBe(403);
    expect(EducationContent.findOne).not.toHaveBeenCalled();
    expect(EducationContent.findOneAndUpdate).not.toHaveBeenCalled();
    expect(EducationContent.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("odbija neispravan identifikator", async () => {
    const response = await GET(request("GET"), params("nije-objectid"));

    expect(response.status).toBe(400);
    expect(EducationContent.findOne).not.toHaveBeenCalled();
  });
});

describe("PATCH — Save Draft", () => {
  it("čuva sve blokove, ali ne dira ni status ni objavljenu verziju", async () => {
    await PATCH(request("PATCH", { blocks: ALL_TWELVE_BLOCKS }), params());

    expect(persistedFields(0)).toEqual({ blocks: ALL_TWELVE_BLOCKS });
    const update = JSON.stringify(
      vi.mocked(EducationContent.findOneAndUpdate).mock.calls[0][1],
    );
    expect(update).not.toContain("status");
    expect(update).not.toContain("publishedSnapshot");
  });

  it("ne dozvoljava da klijent promeni status ili tenant kroz telo zahteva", async () => {
    await PATCH(
      request("PATCH", {
        title: "Novi naslov",
        status: "published",
        tenantId: "tudji-tenant",
      }),
      params(),
    );

    expect(persistedFields(0)).toEqual({ title: "Novi naslov" });
  });

  it("ignoriše pokušaj da telo zahteva prepiše objavljenu verziju", async () => {
    await PATCH(
      request("PATCH", {
        title: "Novi naslov",
        publishedSnapshot: {
          title: "Podmetnuta javna verzija",
          slug: "podmetnuto",
          kind: "article",
          accessMode: "public",
          blocks: [],
          publishedAt: new Date().toISOString(),
        },
      }),
      params(),
    );

    expect(persistedFields(0)).toEqual({ title: "Novi naslov" });
  });

  it("odbija strukturno neispravan draft bez ijedne DB izmene", async () => {
    const response = await PATCH(
      request("PATCH", { blocks: [{ id: "x", type: "NepoznatBlok" }] }),
      params(),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "CONTENT_VALIDATION_FAILED",
    });
    expect(EducationContent.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("menja slug samo kada je eksplicitno poslat i normalizuje ga", async () => {
    await PATCH(request("PATCH", { title: "Sasvim drugi naslov" }), params());
    expect(persistedFields(0)).toEqual({ title: "Sasvim drugi naslov" });

    await PATCH(request("PATCH", { slug: "Nega Kože Zimi" }), params());
    expect(persistedFields(1)).toEqual({ slug: "nega-koze-zimi" });
  });

  it("prevodi koliziju slug-a u 409", async () => {
    vi.mocked(EducationContent.findOneAndUpdate).mockImplementation(() => {
      throw { code: 11000 };
    });

    const response = await PATCH(request("PATCH", { slug: "zauzet" }), params());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "EDUCATION_SLUG_TAKEN" });
  });
});
