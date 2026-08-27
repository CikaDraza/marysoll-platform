import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/models/NewsletterCampaign", () => ({
  NewsletterCampaign: { findOne: vi.fn() },
}));

import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { GET } from "./route";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/landing-campaigns/[...slug]", () => {
  it("javni API zahteva tenant, email-landing, enabled i published", async () => {
    vi.mocked(NewsletterCampaign.findOne).mockReturnValue({
      lean: async () => null,
    } as never);

    const response = await GET(
      new Request("https://tenant.test/api/landing-campaigns/poznat-slug", {
        headers: { "x-tenant-id": "tenant-a" },
      }),
      { params: Promise.resolve({ slug: ["poznat-slug"] }) },
    );

    expect(response.status).toBe(404);
    expect(NewsletterCampaign.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a",
        campaignType: "email-landing",
        "landingPage.enabled": true,
        "landingPage.status": "published",
      }),
    );
  });
});
