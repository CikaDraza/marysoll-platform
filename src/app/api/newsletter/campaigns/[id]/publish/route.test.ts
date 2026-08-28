import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/plans/planEnforcement", () => ({ requireFeature: vi.fn(async () => null) }));
vi.mock("@/lib/newsletter/adminTenantScope", () => ({
  resolveNewsletterAdminScope: vi.fn(),
  newsletterScopeFilter: vi.fn((scope: { scope: string; tenantId?: string; platformOwnerId?: string }) =>
    scope.scope === "tenant" ? { tenantId: scope.tenantId } : { platformOwnerId: scope.platformOwnerId },
  ),
}));
vi.mock("@/models/NewsletterCampaign", () => ({
  NewsletterCampaign: { findOne: vi.fn() },
}));

import { requireAdmin } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import {
  newsletterScopeFilter,
  resolveNewsletterAdminScope,
} from "@/lib/newsletter/adminTenantScope";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { PATCH } from "./route";

const originalSix = [
  { id: "hero", type: "HeroBlock", priority: 1, title: "Hero" },
  { id: "article", type: "ArticleBlock", priority: 2, title: "Članak", paragraphs: ["Tekst"] },
  { id: "feature", type: "FeatureBlock", priority: 3, title: "Koraci", sections: [{ title: "Prvi", paragraphs: ["Tekst"] }] },
  { id: "split", type: "ContentSplitBlock", priority: 4, title: "Podela", content: "Tekst" },
  { id: "pricing", type: "PricingBlock", priority: 5, title: "Cena", items: [{ title: "Paket" }] },
  { id: "cta", type: "AffiliateCTABlock", priority: 6, title: "CTA", ctaLabel: "Otvori", href: "/kontakt" },
];

const allTwelve = [
  ...originalSix,
  { id: "video", type: "VideoBlock", priority: 7, source: { provider: "youtube", url: "https://youtube.com/watch?v=abc" } },
  { id: "table", type: "TableBlock", priority: 8, columns: [{ id: "name", label: "Naziv" }], rows: [{ id: "row", cells: { name: "Vrednost" } }] },
  { id: "callout", type: "CalloutBlock", priority: 9, variant: "important", content: "Važno" },
  { id: "checklist", type: "ChecklistBlock", priority: 10, items: [{ id: "step", text: "Korak" }] },
  { id: "file", type: "FileDownloadBlock", priority: 11, title: "Materijal", file: { src: "/uploads/material.pdf" } },
  { id: "gallery", type: "ImageGalleryBlock", priority: 12, images: [{ id: "image", src: "https://cdn.example.com/image.jpg", alt: "Opis" }] },
];

function requestFor(layout: unknown) {
  return new Request("https://tenant.test/api/newsletter/campaigns/campaign-1/publish", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      layout,
      semanticType: "education",
      audience: "client",
      editorialCategory: "Beauty",
      generatedAt: "2026-08-28T12:00:00.000Z",
      status: "published",
      score: 0.9,
      seo: { title: "Naslov" },
    }),
  });
}

function fakeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    campaignType: "email-landing",
    ctaSlug: "vodic",
    landingPage: {
      status: "generated",
      layout: originalSix,
      score: 0.5,
      seo: { title: "Stari SEO" },
      regeneratedCount: 3,
      customCtas: [{ label: "Postojeći", href: "/postojeci" }],
      ...overrides,
    },
    set: vi.fn(),
    save: vi.fn(async () => undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireFeature).mockResolvedValue(null);
  vi.mocked(requireAdmin).mockResolvedValue({
    success: true,
    decoded: { tenantId: "tenant-a", isSuperAdmin: false },
  } as never);
  vi.mocked(resolveNewsletterAdminScope).mockResolvedValue({
    scope: "tenant",
    tenantId: "tenant-a",
  } as never);
});

describe("PATCH newsletter landing publish content gate", () => {
  it("svih 12 validnih tipova prolazi publish gate i koristi jedan save", async () => {
    const campaign = fakeCampaign();
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor(allTwelve), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(campaign.set).toHaveBeenCalledWith("landingPage.layout", allTwelve);
    expect(campaign.set).toHaveBeenCalledWith("landingPage.status", "published");
    expect(campaign.save).toHaveBeenCalledTimes(1);
  });

  it("hidden structurally-safe incomplete blok ne blokira publish", async () => {
    const campaign = fakeCampaign();
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);
    const layout = [{ id: "hidden", type: "CalloutBlock", priority: 1, visibility: "hidden", variant: "info", content: "" }];

    const response = await PATCH(requestFor(layout), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(campaign.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["visible incomplete", [{ id: "draft", type: "CalloutBlock", priority: 1, variant: "info", content: "" }]],
    ["malformed", [{ id: "bad", type: "TableBlock", priority: 0, columns: [], rows: [] }]],
    ["unknown", [{ id: "future", type: "SomeFutureBlock", priority: 1 }]],
    ["unsafe media", [{ id: "file", type: "FileDownloadBlock", priority: 1, title: "Fajl", file: { src: "data:text/plain,bad" } }]],
  ])("%s vraća 422 pre bilo kakve mutation", async (_label, layout) => {
    const campaign = fakeCampaign();
    const before = structuredClone(campaign.landingPage);
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor(layout), {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: "CONTENT_VALIDATION_FAILED",
      validation: { mode: "publish", valid: false },
    });
    expect(body.validation.blocks[0]).not.toHaveProperty("block");
    expect(campaign.set).not.toHaveBeenCalled();
    expect(campaign.save).not.toHaveBeenCalled();
    expect(campaign.landingPage).toEqual(before);
  });

  it("wrong campaignType ne označava landing kao published", async () => {
    const campaign = fakeCampaign();
    campaign.campaignType = "email-only";
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor(originalSix), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(400);
    expect(campaign.set).not.toHaveBeenCalled();
    expect(campaign.save).not.toHaveBeenCalled();
    expect(campaign.landingPage.status).toBe("generated");
  });

  it("404 ne pokušava persistence mutation", async () => {
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(null);

    const response = await PATCH(requestFor(originalSix), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("invalid scope vraća 403 pre campaign lookup-a", async () => {
    vi.mocked(resolveNewsletterAdminScope).mockResolvedValue(null);

    const response = await PATCH(requestFor(originalSix), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(403);
    expect(NewsletterCampaign.findOne).not.toHaveBeenCalled();
    expect(requireFeature).not.toHaveBeenCalled();
  });

  it("tenant feature denial vraća 403 bez campaign mutation-a", async () => {
    vi.mocked(requireFeature).mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) as never,
    );

    const response = await PATCH(requestFor(originalSix), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(403);
    expect(NewsletterCampaign.findOne).not.toHaveBeenCalled();
  });

  it("platform/superadmin publish zadržava platform scope i preskače tenant feature gate", async () => {
    const campaign = fakeCampaign();
    vi.mocked(requireAdmin).mockResolvedValue({ success: true, decoded: { isSuperAdmin: true, userId: "owner" } } as never);
    vi.mocked(resolveNewsletterAdminScope).mockResolvedValue({ scope: "platform", platformOwnerId: "owner" } as never);
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor(originalSix), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(requireFeature).not.toHaveBeenCalled();
    expect(newsletterScopeFilter).toHaveBeenCalledWith(expect.objectContaining({ scope: "platform" }));
    expect(NewsletterCampaign.findOne).toHaveBeenCalledWith({ _id: "campaign-1", platformOwnerId: "owner" });
  });

  it("targeted publish čuva unrelated customCtas i originalni manual block payload", async () => {
    const campaign = fakeCampaign();
    const callout = [{ id: "manual", type: "CalloutBlock", priority: 1, variant: "tip", title: "Savet", content: "Tekst", extension: { source: "legacy-compatible" } }];
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor(callout), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(campaign.set).toHaveBeenCalledWith("landingPage.layout", callout);
    expect(campaign.set).not.toHaveBeenCalledWith("landingPage.customCtas", expect.anything());
    expect(campaign.landingPage.customCtas).toEqual([{ label: "Postojeći", href: "/postojeci" }]);
  });
});
