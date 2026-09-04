import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/plans/planEnforcement", () => ({
  requireFeature: vi.fn(async () => null),
}));
vi.mock("@/lib/newsletter/adminTenantScope", () => ({
  resolveNewsletterAdminScope: vi.fn(),
  newsletterScopeFilter: vi.fn((scope: { tenantId: string }) => ({
    tenantId: scope.tenantId,
  })),
}));
vi.mock("@/models/NewsletterCampaign", () => ({
  NewsletterCampaign: { findOneAndUpdate: vi.fn() },
}));

import { requireAdmin } from "@/lib/auth/auth-server";
import { resolveNewsletterAdminScope } from "@/lib/newsletter/adminTenantScope";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { PATCH } from "./route";

function requestFor(payload: unknown) {
  return new Request(
    "https://tenant.test/api/newsletter/campaigns/campaign-1/semantic",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

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
  vi.mocked(NewsletterCampaign.findOneAndUpdate).mockResolvedValue({
    _id: "campaign-1",
  } as never);
});

describe("PATCH newsletter semantic write boundary", () => {
  it("odbija landing layout pre persistence poziva", async () => {
    const response = await PATCH(
      requestFor({
        semanticContent: { intent: "education" },
        landingPage: {
          slug: "vodic",
          layout: [
            {
              id: "callout",
              type: "CalloutBlock",
              priority: 1,
              variant: "info",
              content: "Tekst",
            },
          ],
        },
      }),
      { params: Promise.resolve({ id: "campaign-1" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "LANDING_LAYOUT_WRITE_NOT_ALLOWED",
    });
    expect(NewsletterCampaign.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("čuva samo semantic i dozvoljeni landing metadata kroz targeted $set", async () => {
    const response = await PATCH(
      requestFor({
        campaignType: "email-landing",
        semanticContent: {
          intent: "education",
          summary: "Sažetak",
          tone: "informative",
        },
        landingPage: {
          enabled: true,
          slug: "/blog/Moj vodič",
          audience: "client",
          editorialCategory: "Beauty",
          seo: { title: "Ne sme ovde" },
          status: "published",
        },
      }),
      { params: Promise.resolve({ id: "campaign-1" }) },
    );

    expect(response.status).toBe(201);
    expect(NewsletterCampaign.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "campaign-1", tenantId: "tenant-a" },
      {
        $set: {
          campaignType: "email-landing",
          ctaSlug: "moj-vodic",
          semanticContent: {
            intent: "education",
            summary: "Sažetak",
            tone: "informative",
            status: "draft",
          },
          "landingPage.audience": "client",
          "landingPage.editorialCategory": "Beauty",
          "landingPage.enabled": true,
          "landingPage.slug": "moj-vodic",
        },
      },
      { new: true },
    );
  });
});
