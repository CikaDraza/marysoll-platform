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

const validHero = {
  id: "hero",
  type: "HeroBlock",
  priority: 1,
  title: "Naslov",
};

function requestFor(layout: unknown, overrides: Record<string, unknown> = {}) {
  return new Request("https://tenant.test/api/newsletter/campaigns/campaign-1/save", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      campaignType: "email-landing",
      semanticContent: { intent: "education", status: "generated" },
      landingPage: {
        slug: "Moj vodič",
        layout,
        status: "generated",
        audience: "client",
        editorialCategory: "Beauty",
        ...overrides,
      },
    }),
  });
}

function fakeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    campaignType: "email-landing",
    semanticContent: { intent: "old" },
    landingPage: {
      status: "pending",
      regeneratedCount: 2,
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

describe("PATCH newsletter campaign save content gate", () => {
  it("validan layout prolazi draft gate i čuva original layout jednom", async () => {
    const campaign = fakeCampaign();
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);
    const layout = [
      validHero,
      {
        id: "manual-callout",
        type: "CalloutBlock",
        priority: 2,
        variant: "tip",
        title: "Savet",
        content: "Originalni ručni sadržaj",
        extension: { source: "legacy-compatible" },
      },
    ];

    const response = await PATCH(requestFor(layout), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(campaign.set).toHaveBeenCalledWith("landingPage.layout", layout);
    expect(campaign.save).toHaveBeenCalledTimes(1);
    expect(NewsletterCampaign.findOne).toHaveBeenCalledWith({
      _id: "campaign-1",
      tenantId: "tenant-a",
    });
  });

  it.each([
    {
      label: "visible incomplete",
      block: { id: "draft", type: "CalloutBlock", priority: 1, variant: "info", content: "" },
    },
    {
      label: "hidden incomplete",
      block: { id: "hidden", type: "CalloutBlock", priority: 1, visibility: "hidden", variant: "info", content: "" },
    },
  ])("čuva $label draft", async ({ block }) => {
    const campaign = fakeCampaign();
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor([block]), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(campaign.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["malformed", [{ id: "bad", type: "TableBlock", priority: "first", columns: [], rows: [] }]],
    ["unknown", [{ id: "future", type: "SomeFutureBlock", priority: 1 }]],
    ["unsafe media", [{ id: "gallery", type: "ImageGalleryBlock", priority: 1, images: [{ id: "image", src: "blob:local", alt: "Opis" }] }]],
    ["non-array", { blocks: [] }],
  ])("%s layout vraća structured 422 bez mutation-a", async (_label, layout) => {
    const campaign = fakeCampaign();
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor(layout), {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      error: "Content validation failed",
      code: "CONTENT_VALIDATION_FAILED",
      validation: { mode: "draft", valid: false },
    });
    expect(body.validation.issues[0]).toEqual(
      expect.objectContaining({ blockId: expect.any(String), code: "invalid_structure" }),
    );
    expect(campaign.set).not.toHaveBeenCalled();
    expect(campaign.save).not.toHaveBeenCalled();
  });

  it("targeted update čuva postojeći customCtas kada ga payload ne poseduje", async () => {
    const campaign = fakeCampaign();
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor([validHero]), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(campaign.set).not.toHaveBeenCalledWith("landingPage.customCtas", expect.anything());
    expect(campaign.landingPage.customCtas).toEqual([{ label: "Postojeći", href: "/postojeci" }]);
  });

  it("platform/superadmin scope ne poziva tenant feature gate", async () => {
    const campaign = fakeCampaign();
    vi.mocked(requireAdmin).mockResolvedValue({ success: true, decoded: { isSuperAdmin: true, userId: "owner" } } as never);
    vi.mocked(resolveNewsletterAdminScope).mockResolvedValue({ scope: "platform", platformOwnerId: "owner" } as never);
    vi.mocked(NewsletterCampaign.findOne).mockResolvedValue(campaign as never);

    const response = await PATCH(requestFor([validHero]), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(requireFeature).not.toHaveBeenCalled();
    expect(newsletterScopeFilter).toHaveBeenCalledWith(expect.objectContaining({ scope: "platform" }));
    expect(NewsletterCampaign.findOne).toHaveBeenCalledWith({ _id: "campaign-1", platformOwnerId: "owner" });
  });

  it("authentication failure zadržava 401 i ne pristupa kampanji", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    } as never);

    const response = await PATCH(requestFor([validHero]), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(response.status).toBe(401);
    expect(NewsletterCampaign.findOne).not.toHaveBeenCalled();
  });
});
