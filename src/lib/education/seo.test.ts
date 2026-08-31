import { describe, expect, it } from "vitest";
import { educationArticleMetadata } from "./seo";
import type { PublicEducationArticle } from "./publicContent";
import { getPublicSiteContext } from "@/lib/seo/public-site";
import type { SalonProfileData } from "@/types";

const context = getPublicSiteContext({
  domainType: "tenant",
  tenantSlug: "marina",
  tenantCustomDomain: "",
  publicHost: "marina.marysoll.com",
});

const profile = {
  name: "Marina Stanisavljević",
  logo: "https://cdn.example.com/logo.png",
  notificationLogo: null,
} as unknown as SalonProfileData;

const article = (over: Partial<PublicEducationArticle> = {}) =>
  ({
    slug: "estetika-lica",
    title: "Estetika lica",
    kind: "article",
    accessMode: "public",
    publishedAt: "2026-08-29T10:00:00.000Z",
    description: "Anatomija, proporcije i granica prenaglašenosti",
    cover: { src: "https://cdn.example.com/naslovna.jpg" },
    blocks: [],
    ...over,
  }) as PublicEducationArticle;

describe("metapodaci javnog članka", () => {
  it("članak nosi svoj naslov, opis i kanonsku adresu", () => {
    const meta = educationArticleMetadata({ profile, context, article: article() });

    expect(meta.title).toBe("Estetika lica");
    expect(meta.description).toBe(
      "Anatomija, proporcije i granica prenaglašenosti",
    );
    // Bez kanonske adrese se članak ne rangira na svojoj strani.
    expect(meta.alternates?.canonical).toContain("/edukacija/estetika-lica");
  });

  it("SEO polja nadjačavaju naslovnu sekciju kada su uneta", () => {
    const meta = educationArticleMetadata({
      profile,
      context,
      article: article({
        seo: {
          title: "Drugi naslov za pretragu",
          description: "Drugi opis",
          ogImage: "https://cdn.example.com/og.jpg",
        },
      }),
    });

    expect(meta.title).toBe("Drugi naslov za pretragu");
    expect(meta.description).toBe("Drugi opis");
    expect(meta.openGraph?.images).toEqual([
      { url: "https://cdn.example.com/og.jpg" },
    ]);
  });

  it("bez SEO slike deli se naslovna slika", () => {
    const meta = educationArticleMetadata({ profile, context, article: article() });

    expect(meta.openGraph?.images).toEqual([
      { url: "https://cdn.example.com/naslovna.jpg" },
    ]);
  });

  it("bez ijedne slike pada na sliku salona, jer prazan OG ne deli ništa", () => {
    const meta = educationArticleMetadata({
      profile,
      context,
      article: article({ cover: undefined }),
    });

    expect(meta.openGraph?.images).not.toEqual([]);
  });

  it("označava se kao članak i nosi datum objave", () => {
    const meta = educationArticleMetadata({ profile, context, article: article() });
    const openGraph = meta.openGraph as {
      type?: string;
      publishedTime?: string;
      url?: string;
    };

    expect(openGraph.type).toBe("article");
    expect(openGraph.publishedTime).toBe("2026-08-29T10:00:00.000Z");
    expect(openGraph.url).toContain("/edukacija/estetika-lica");
  });

  it("preview okruženje se ne indeksira", () => {
    const preview = getPublicSiteContext({
      domainType: "tenant",
      tenantSlug: "marina",
      tenantCustomDomain: "",
      publicHost: "staging.marysoll.com",
    });

    const meta = educationArticleMetadata({
      profile,
      context: preview,
      article: article(),
    });

    if (preview.isPreview) {
      expect(meta.robots).toEqual({ index: false, follow: false });
    }
  });
});
