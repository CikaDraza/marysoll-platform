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
    EducationContent: { find: vi.fn(), create: vi.fn() },
  };
});

import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { EducationContent } from "@/models/EducationContent";
import { GET, POST } from "./route";

const TENANT = "6650a1f1a1f1a1f1a1f1a1f1";

function request(body?: unknown) {
  return new Request("https://admin.marysoll.com/api/education/content", {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const validPayload = {
  title: "Estetika lica",
  kind: "article",
  visibility: "public",
  blocks: ALL_TWELVE_BLOCKS,
};

function mockList(items: unknown[]) {
  vi.mocked(EducationContent.find).mockReturnValue({
    select: () => ({ sort: () => ({ lean: async () => items }) }),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireTenantAdmin).mockReturnValue({
    success: true,
    tenantId: TENANT,
  });
  vi.mocked(requireCapability).mockResolvedValue(null);
  vi.mocked(EducationContent.create).mockImplementation(
    async (doc: Record<string, unknown>) =>
      ({ toObject: () => ({ _id: "new-id", ...doc }) }) as never,
  );
  mockList([]);
});

describe("GET /api/education/content", () => {
  it("vraća samo sadržaj tenanta iz auth konteksta", async () => {
    mockList([{ _id: "1", title: "Estetika lica" }]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(EducationContent.find).toHaveBeenCalledWith({ tenantId: TENANT });
    expect(await response.json()).toEqual({
      items: [{ _id: "1", title: "Estetika lica" }],
    });
  });

  it("odbija korisnika bez admin permission-a", async () => {
    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(EducationContent.find).not.toHaveBeenCalled();
  });

  it("odbija tenant bez education capability-ja", async () => {
    vi.mocked(requireCapability).mockResolvedValue(
      NextResponse.json({ code: "CAPABILITY_NOT_ENABLED" }, { status: 403 }),
    );

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(EducationContent.find).not.toHaveBeenCalled();
  });
});

describe("POST /api/education/content", () => {
  it("kreira draft sa tenantId iz auth konteksta, ne iz tela zahteva", async () => {
    const response = await POST(
      request({ ...validPayload, tenantId: "tudji-tenant", status: "published" }),
    );

    expect(response.status).toBe(201);
    const [created] = vi.mocked(EducationContent.create).mock.calls[0];
    expect(created).toMatchObject({
      tenantId: TENANT,
      slug: "estetika-lica",
      status: "draft",
    });
    expect(created.blocks).toEqual(ALL_TWELVE_BLOCKS);
  });

  it("čuva nepotpun draft, ali odbija strukturno neispravan", async () => {
    const incomplete = await POST(
      request({
        ...validPayload,
        blocks: [{ id: "a", type: "ArticleBlock", priority: 1, title: "", paragraphs: [] }],
      }),
    );
    expect(incomplete.status).toBe(201);

    vi.mocked(EducationContent.create).mockClear();
    const invalid = await POST(
      request({ ...validPayload, blocks: [{ id: "x", type: "NepoznatBlok" }] }),
    );

    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({
      code: "CONTENT_VALIDATION_FAILED",
    });
    expect(EducationContent.create).not.toHaveBeenCalled();
  });

  it("odbija metadata bez naslova i nepoznat kind", async () => {
    const noTitle = await POST(request({ ...validPayload, title: "  " }));
    const badKind = await POST(request({ ...validPayload, kind: "course" }));

    expect(noTitle.status).toBe(400);
    expect(badKind.status).toBe(400);
    expect(EducationContent.create).not.toHaveBeenCalled();
  });

  it("prevodi koliziju slug-a u 409", async () => {
    vi.mocked(EducationContent.create).mockRejectedValue({ code: 11000 });

    const response = await POST(request(validPayload));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "EDUCATION_SLUG_TAKEN",
    });
  });

  it("poštuje eksplicitno unet slug umesto naslova", async () => {
    await POST(request({ ...validPayload, slug: "Nega Kože Zimi" }));

    expect(vi.mocked(EducationContent.create).mock.calls[0][0]).toMatchObject({
      slug: "nega-koze-zimi",
    });
  });
});
