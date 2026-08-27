import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/plans/planEnforcement", () => ({ requireFeature: vi.fn(async () => null) }));
vi.mock("@/lib/newsletter/adminTenantScope", () => ({
  resolveNewsletterAdminScope: vi.fn(),
  newsletterScopeFilter: vi.fn(() => ({ tenantId: "tenant-a" })),
}));
vi.mock("@/models/NewsletterCampaign", () => ({
  NewsletterCampaign: { find: vi.fn(), updateOne: vi.fn() },
}));
vi.mock("@/models/NewsletterLog", () => ({
  NewsletterLog: { countDocuments: vi.fn(async () => 0) },
}));

import { requireAdmin } from "@/lib/auth/auth-server";
import { resolveNewsletterAdminScope } from "@/lib/newsletter/adminTenantScope";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockReturnValue({
    success: true,
    decoded: { tenantId: "tenant-a", isSuperAdmin: false },
  } as never);
  vi.mocked(resolveNewsletterAdminScope).mockResolvedValue({
    scope: "tenant",
    tenantId: "tenant-a",
  } as never);
});

describe("GET /api/newsletter/campaigns admin contract", () => {
  it("authenticated admin i dalje dobija generated landing draft", async () => {
    const draft = {
      _id: "draft-1",
      tenantId: "tenant-a",
      status: "draft",
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      landingPage: { enabled: true, status: "generated", slug: "draft-slug" },
    };
    vi.mocked(NewsletterCampaign.find).mockReturnValue({
      sort: () => ({ lean: async () => [draft] }),
    } as never);

    const response = await GET(
      new NextRequest("https://tenant.test/api/newsletter/campaigns"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([draft]);
    expect(NewsletterCampaign.find).toHaveBeenCalledWith({ tenantId: "tenant-a" });
  });
});
