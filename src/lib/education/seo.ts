import type { Metadata } from "next";
import type { SalonProfileData } from "@/types";
import {
  getCanonicalUrl,
  type PublicSiteContext,
} from "@/lib/seo/public-site";
import { getTenantSocialImage } from "@/lib/seo/socialImage";
import type { PublicEducationArticle } from "@/lib/education/publicContent";

/**
 * Metapodaci javnog Education članka.
 *
 * Javna edukacija se rangira na SVOJOJ adresi, pa svaki članak mora imati svoj
 * naslov, opis, kanonsku adresu i sliku za deljenje — a ne da nasledi
 * metapodatke početne strane.
 *
 * Izvor prati isti redosled kao i sama strana: naslovna sekcija je istina, SEO
 * polja su rezerva za slučaj kada za pretragu treba nešto drugo. Zaključan
 * sadržaj sme da se indeksira, ali samo svojim javnim pregledom — telo mu
 * ionako nikada ne stiže do ove strane.
 */
export function educationArticleMetadata(params: {
  profile: SalonProfileData | null;
  context: PublicSiteContext;
  article: PublicEducationArticle;
}): Metadata {
  const { profile, context, article } = params;
  const url = getCanonicalUrl(context, `/edukacija/${article.slug}`);

  const title = article.seo?.title?.trim() || article.title;
  const description = article.seo?.description?.trim() || article.description;
  // Social crawler-i ne renderuju SVG, pa fallback ide kroz isti lanac koji
  // koriste ostale tenant strane.
  const image =
    article.seo?.ogImage?.trim() ||
    article.cover?.src ||
    getTenantSocialImage(profile, context);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: profile?.name || "Salon",
      type: "article",
      publishedTime: article.publishedAt,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: context.isPreview ? { index: false, follow: false } : undefined,
  };
}
