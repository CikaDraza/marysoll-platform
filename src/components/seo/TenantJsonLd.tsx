import type { SalonProfileData } from "@/types";
import { getCanonicalOrigin, getCanonicalUrl, type PublicSiteContext } from "@/lib/seo/public-site";

function socialUrl(value: string | undefined, network: string): string | null {
  const clean = value?.trim();
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) return clean;
  if (network === "instagram") return `https://www.instagram.com/${clean.replace(/^@/, "")}/`;
  return null;
}

/** Public, tenant-scoped entity graph. It intentionally omits unknown fields. */
export function TenantJsonLd({
  profile,
  context,
  pathname,
}: {
  profile: SalonProfileData;
  context: PublicSiteContext;
  pathname: string;
}) {
  const origin = getCanonicalOrigin(context);
  const pageUrl = getCanonicalUrl(context, pathname);
  const address = [profile.street, profile.city].filter(Boolean).join(", ");
  const sameAs = [
    socialUrl(profile.social?.instagram, "instagram"),
    socialUrl(profile.social?.facebook, "facebook"),
    socialUrl(profile.social?.tiktok, "tiktok"),
  ].filter((url): url is string => Boolean(url));
  const business = {
    "@type": "BeautySalon",
    "@id": `${origin}/#business`,
    name: profile.name,
    url: origin,
    ...(profile.description ? { description: profile.description } : {}),
    ...(profile.logo ? { image: profile.logo } : {}),
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(address ? { address: { "@type": "PostalAddress", ...(profile.street ? { streetAddress: profile.street } : {}), ...(profile.city ? { addressLocality: profile.city } : {}) } } : {}),
    ...(profile.lat != null && profile.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: profile.lat, longitude: profile.lng } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      business,
      { "@type": "WebSite", "@id": `${origin}/#website`, url: origin, name: profile.name, publisher: { "@id": `${origin}/#business` } },
      { "@type": "WebPage", "@id": `${pageUrl}#webpage`, url: pageUrl, name: profile.name, isPartOf: { "@id": `${origin}/#website` }, about: { "@id": `${origin}/#business` } },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />;
}
