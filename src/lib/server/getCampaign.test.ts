import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/models/NewsletterCampaign", () => ({
  NewsletterCampaign: { findOne: vi.fn() },
}));

import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { getCampaign } from "./getCampaign";

type CampaignRow = {
  _id: string;
  tenantId: string;
  campaignType: string;
  ctaSlug?: string;
  landingPage: { slug: string; enabled: boolean; status: string };
};

let rows: CampaignRow[] = [];

function matches(row: CampaignRow, query: Record<string, unknown>) {
  if (row.tenantId !== query.tenantId) return false;
  if (row.campaignType !== query.campaignType) return false;
  if (row.landingPage.enabled !== query["landingPage.enabled"]) return false;
  if (row.landingPage.status !== query["landingPage.status"]) return false;

  return (query.$or as Record<string, string>[]).some((candidate) =>
    Object.entries(candidate).every(([key, value]) =>
      key === "ctaSlug" ? row.ctaSlug === value : row.landingPage.slug === value,
    ),
  );
}

function campaign(
  status: string,
  options: { tenantId?: string; enabled?: boolean; id?: string } = {},
): CampaignRow {
  return {
    _id: options.id ?? status,
    tenantId: options.tenantId ?? "tenant-a",
    campaignType: "email-landing",
    landingPage: {
      slug: "poznat-slug",
      enabled: options.enabled ?? true,
      status,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  vi.mocked(NewsletterCampaign.findOne).mockImplementation((query) => ({
    lean: async () => rows.find((row) => matches(row, query as never)) ?? null,
  }) as never);
});

describe("getCampaign — javni blog loader", () => {
  it("vraća samo published + enabled kampanju istog tenant-a", async () => {
    rows = [
      campaign("published", { tenantId: "tenant-b", id: "other-tenant" }),
      campaign("published", { id: "public" }),
    ];

    await expect(getCampaign("/blog/poznat-slug", "tenant-a")).resolves.toMatchObject({
      _id: "public",
    });
    expect(NewsletterCampaign.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a",
        campaignType: "email-landing",
        "landingPage.enabled": true,
        "landingPage.status": "published",
      }),
    );
  });

  it.each(["pending", "generated", "failed"])(
    "poznat slug sa statusom %s nije javno dostupan",
    async (status) => {
      rows = [campaign(status)];
      await expect(getCampaign("/blog/poznat-slug", "tenant-a")).rejects.toThrow(
        "Campaign not found",
      );
    },
  );

  it("published ali disabled kampanja nije javno dostupna", async () => {
    rows = [campaign("published", { enabled: false })];
    await expect(getCampaign("/blog/poznat-slug", "tenant-a")).rejects.toThrow(
      "Campaign not found",
    );
  });

  it("isti published slug drugog tenant-a nije dostupan", async () => {
    rows = [campaign("published", { tenantId: "tenant-b" })];
    await expect(getCampaign("/blog/poznat-slug", "tenant-a")).rejects.toThrow(
      "Campaign not found",
    );
  });
});
