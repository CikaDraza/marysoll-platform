/**
 * lib/tenant/blogPosts.ts — objave tenanta (email-landing kampanje objavljene
 * kao blog tekstovi).
 *
 * Mapiranje je ovde, a ne u klijentskom hook-u, jer ga sada koriste DVA
 * pozivaoca sa istim ugovorom:
 *   - `content.blog` loader (server, kroz `BlockDataSource`);
 *   - `useBlogPosts` (klijent, `/blogs` listing gde pagination traži React Query).
 *
 * Da je ostalo u hook-u, server loader bi morao da napravi drugu kopiju istog
 * oblika — i prvi propušten `slug` prefiks bio bi tiha razlika između landing
 * kartice i listing strane.
 */
import type { INewsletterCampaign } from "@/types";

export interface MappedBlogPost {
  _id: string;
  slug: string;
  title: string;
  description: string;
  dateFormatted: string;
  dateISO: string;
  categoryTitle: string;
  ogImage: string;
  initials: string;
}

export function mapBlogPost(campaign: INewsletterCampaign): MappedBlogPost {
  const lp = campaign.landingPage;
  const rawSlug = lp?.slug ?? "";
  const slug = rawSlug.replace(/^\/blog\/+/i, "").replace(/^\/+/, "");
  const title = lp?.seo?.title || campaign.name;
  const semanticType = lp?.semanticType ?? "blog";
  const createdAt = new Date(campaign.createdAt);

  return {
    _id: String(campaign._id),
    slug,
    title,
    description: lp?.seo?.description ?? "",
    dateFormatted: createdAt.toLocaleDateString("sr-RS", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    dateISO: createdAt.toISOString().split("T")[0],
    categoryTitle: semanticType.charAt(0).toUpperCase() + semanticType.slice(1),
    ogImage: lp?.seo?.ogImage ?? "",
    initials: title
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
  };
}

/** Filter objavljenih blog kampanja — deljen između API rute i server loadera. */
export function publishedBlogFilter(tenantId: unknown) {
  return {
    tenantId,
    campaignType: "email-landing",
    "landingPage.enabled": true,
    "landingPage.status": "published",
  };
}
