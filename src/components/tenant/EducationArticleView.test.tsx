import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type { PublicEducationArticle } from "@/lib/education/publicContent";
import { educationArticleMetadata } from "@/lib/education/seo";
import type { PublicSiteContext } from "@/lib/seo/public-site";
import { EducationArticleView } from "./EducationArticleView";

/**
 * JAVNO ZAGLAVLJE ČITA AUTORSKI SADRŽAJ, NIKADA SEO.
 *
 * Regresija koja se vraćala: `seo.title` i `seo.description` su pisani za
 * pretragu i deljenje, ali su kroz fallback lanac umeli da postanu vidljivi
 * `h1` i uvodni pasus, dok je pravi naslov sadržaja ostajao niže na strani u
 * slabijoj hijerarhiji. Ovi testovi zaključavaju oba smera: šta se vidi i šta
 * ide u metapodatke.
 */
const AUTHOR_TITLE = "Kako prepoznati dehidriranu kožu";
const AUTHOR_LEAD =
  "Nega kože počinje razumevanjem njene trenutne barijere. Dehidrirana koža nije tip kože, već trenutno stanje.";
const SEO_TITLE = "Dehidrirana koža — vodič za prepoznavanje | Salon";
const SEO_DESCRIPTION = "Saznajte kako da prepoznate dehidriranu kožu i šta joj pomaže.";

const primaryVideo: ContentBlock = {
  id: "primary-video",
  type: "VideoBlock",
  priority: 1,
  source: { provider: "youtube", url: "https://www.youtube.com/watch?v=abc12345678" },
};

const supportingArticle: ContentBlock = {
  id: "supporting",
  type: "ArticleBlock",
  priority: 2,
  title: "Kako prepoznati dehidriranu kožu?",
  paragraphs: ["Barijera se oporavlja sporije nego što očekujemo."],
};

function videoArticle(
  overrides: Partial<PublicEducationArticle> = {},
): PublicEducationArticle {
  return {
    slug: "kako-prepoznati-dehidriranu-kozu",
    title: AUTHOR_TITLE,
    kind: "video",
    format: "video",
    accessMode: "public",
    publishedAt: "2026-09-04T10:00:00.000Z",
    description: AUTHOR_LEAD,
    blocks: [primaryVideo, supportingArticle],
    seo: { title: SEO_TITLE, description: SEO_DESCRIPTION },
    ...overrides,
  };
}

const TENANT_CONTEXT: PublicSiteContext = {
  kind: "TENANT",
  slug: "salon",
  primaryOrigin: "https://salon.test",
  isPreview: false,
};

function render(article: PublicEducationArticle): string {
  return renderToStaticMarkup(
    <EducationArticleView article={article} basePath="" author={null} />,
  );
}

/** Tekst prvog `h1`, bez ugnježdenog markup-a. */
function heading(html: string, tag: "h1" | "h2"): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/<[^>]*>/g, "").trim() : null;
}

describe("javno Education zaglavlje", () => {
  it("Hero h1 je naslov sadržaja, ne SEO naslov", () => {
    const html = render(videoArticle());

    expect(heading(html, "h1")).toBe(AUTHOR_TITLE);
    expect(html).not.toContain(SEO_TITLE);
  });

  it("Hero uvodni pasus je opis sadržaja, ne SEO opis", () => {
    const html = render(videoArticle());

    expect(html).toContain(AUTHOR_LEAD);
    expect(html).not.toContain(SEO_DESCRIPTION);
  });

  it("bez autorskog opisa zaglavlje ćuti umesto da posegne za SEO tekstom", () => {
    const html = render(videoArticle({ description: undefined }));

    expect(heading(html, "h1")).toBe(AUTHOR_TITLE);
    expect(html).not.toContain(SEO_DESCRIPTION);
    expect(html).not.toContain(SEO_TITLE);
  });

  it("zaglavlje se ne ponavlja niže na strani", () => {
    const html = render(videoArticle());

    // Jedan `h1` i jedan uvodni pasus; blokovi počinju od `h2`.
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.split(AUTHOR_LEAD)).toHaveLength(2);
    expect(heading(html, "h2")).toBe("Kako prepoznati dehidriranu kožu?");
  });

  it("zatečeni hero blok se upija u zaglavlje umesto da se prikaže drugi put", () => {
    const legacyHero: ContentBlock = {
      id: "legacy-hero",
      type: "HeroBlock",
      priority: 0,
      title: AUTHOR_TITLE,
      subtitle: AUTHOR_LEAD,
    };
    const html = render(
      videoArticle({ blocks: [legacyHero, primaryVideo, supportingArticle] }),
    );

    expect(html).not.toContain('id="legacy-hero"');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.split(AUTHOR_LEAD)).toHaveLength(2);
  });

  it("SEO naslov i opis i dalje pravilno ulaze u metapodatke", () => {
    const metadata = educationArticleMetadata({
      profile: null,
      context: TENANT_CONTEXT,
      article: videoArticle(),
    });

    expect(metadata.title).toBe(SEO_TITLE);
    expect(metadata.description).toBe(SEO_DESCRIPTION);
    expect(metadata.openGraph?.title).toBe(SEO_TITLE);
    expect(metadata.openGraph?.description).toBe(SEO_DESCRIPTION);
  });

  it("bez SEO polja metapodaci padaju na autorski naslov i opis", () => {
    const metadata = educationArticleMetadata({
      profile: null,
      context: TENANT_CONTEXT,
      article: videoArticle({ seo: undefined }),
    });

    expect(metadata.title).toBe(AUTHOR_TITLE);
    expect(metadata.description).toBe(AUTHOR_LEAD);
  });

  it("kind=video: h1 i uvod stoje pre video bloka", () => {
    const html = render(videoArticle());

    const kindLabel = html.indexOf("Video</p>");
    const h1 = html.indexOf("<h1");
    const lead = html.indexOf(AUTHOR_LEAD);
    const meta = html.indexOf("<time");
    const video = html.indexOf('id="primary-video"');
    const supporting = html.indexOf('id="supporting"');

    expect(kindLabel).toBeGreaterThan(-1);
    expect(video).toBeGreaterThan(-1);
    expect(kindLabel).toBeLessThan(h1);
    expect(h1).toBeLessThan(lead);
    expect(lead).toBeLessThan(meta);
    expect(meta).toBeLessThan(video);
    expect(video).toBeLessThan(supporting);
  });
});
