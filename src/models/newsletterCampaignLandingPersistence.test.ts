import { describe, expect, it } from "vitest";
import { NewsletterCampaign } from "./NewsletterCampaign";

describe("NewsletterCampaign targeted landing persistence", () => {
  it("nested layout/status set čuva model-supported customCtas i metadata", () => {
    const campaign = new NewsletterCampaign({
      name: "Kampanja",
      subject: "Naslov",
      content: "Email",
      campaignType: "email-landing",
      landingPage: {
        enabled: true,
        slug: "stari-slug",
        status: "generated",
        layout: [],
        customCtas: [{ label: "Postojeći", href: "/postojeci", placement: "hero" }],
        semanticType: "education",
        audience: "client",
        editorialCategory: "Beauty",
        score: 0.5,
        seo: { title: "Postojeći SEO" },
      },
    });

    campaign.set("landingPage.layout", [
      { id: "callout", type: "CalloutBlock", priority: 1, variant: "tip", content: "Savet" },
    ]);
    campaign.set("landingPage.status", "published");

    expect(campaign.landingPage.customCtas.toObject()).toEqual([
      { label: "Postojeći", href: "/postojeci", placement: "hero" },
    ]);
    expect(campaign.landingPage.semanticType).toBe("education");
    expect(campaign.landingPage.seo.title).toBe("Postojeći SEO");
    expect(campaign.landingPage.status).toBe("published");
  });
});
