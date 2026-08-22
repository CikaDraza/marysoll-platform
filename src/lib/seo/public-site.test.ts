import { describe, expect, it } from "vitest";
import { getCanonicalUrl, getPublicSiteContext, tenantPageMetadata } from "./public-site";

const tenant = (slug: string, domain: string) => getPublicSiteContext({
  domainType: "client", tenantSlug: slug, tenantCustomDomain: domain, publicHost: domain,
});

describe("tenant public SEO contract", () => {
  it("keeps canonical origins tenant-scoped across sequential requests", () => {
    const makeup = tenant("marysoll-makeup", "marysoll.makeup");
    const lashroom = tenant("the-lash-room", "lashroom-byanja.com");
    expect(getCanonicalUrl(makeup, "/usluge")).toBe("https://marysoll.makeup/usluge");
    expect(getCanonicalUrl(lashroom, "/usluge")).toBe("https://lashroom-byanja.com/usluge");
  });

  it("uses the same tenant URL for canonical, OG URL and social fallback", () => {
    const context = tenant("kiki-kiss", "kikikiss.beauty");
    const metadata = tenantPageMetadata(null, context, "/termini", "Kiki", "Opis");
    expect(metadata.alternates).toEqual({ canonical: "https://kikikiss.beauty/termini" });
    expect(metadata.openGraph).toMatchObject({ url: "https://kikikiss.beauty/termini" });
    expect(metadata.twitter).toMatchObject({ images: ["https://kikikiss.beauty/favicon.ico"] });
  });

  it("marks preview tenant pages noindex while retaining the production canonical", () => {
    const context = getPublicSiteContext({
      domainType: "client", tenantSlug: "kiki-kiss", tenantCustomDomain: "kikikiss.beauty",
      publicHost: "marysoll-git-seo.vercel.app",
    });
    expect(context.isPreview).toBe(true);
    expect(getCanonicalUrl(context)).toBe("https://kikikiss.beauty");
  });
});
