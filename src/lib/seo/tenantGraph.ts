/**
 * Gradnja tenant entity grafa (schema.org) — čisto, bez React-a, da se sadržaj
 * i granice privatnosti mogu testirati bez renderovanja.
 *
 * Graf postoji da bi pretraga i AI asistenti mogli da povežu JEDAN salon preko
 * više javnih izvora: zvanični sajt, društvene mreže i Marysoll discovery
 * profil. Zato @id vrednosti moraju biti stabilne i vezane za KANONSKI origin
 * tenanta — na njima se gradi identitet entiteta.
 *
 * PRAVILO PRIVATNOSTI: polje ulazi u graf samo ako je već javno na sajtu.
 * Prisustvo podatka u Mongo dokumentu nije razlog da se objavi.
 * `phone` je uključen jer teme javno prikazuju `tel:` link na taj isti broj.
 */

import type { SalonProfileData } from "@/types";
import {
  getCanonicalOrigin,
  getCanonicalUrl,
  type PublicSiteContext,
} from "./public-site";
import { getTenantRasterImage } from "./socialImage";
import { normalizeCopy } from "./metadataFallback";

export function socialUrl(
  value: string | undefined,
  network: string,
): string | null {
  const clean = value?.trim();
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) return clean;
  const handle = clean.replace(/^@/, "");
  if (network === "instagram") return `https://www.instagram.com/${handle}/`;
  if (network === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (network === "facebook") return `https://www.facebook.com/${handle}`;
  return null;
}

export function buildTenantGraph(
  profile: SalonProfileData,
  context: PublicSiteContext,
  pathname: string,
): Record<string, unknown> {
  const origin = getCanonicalOrigin(context);
  const pageUrl = getCanonicalUrl(context, pathname);
  const address = [profile.street, profile.city].filter(Boolean).join(", ");

  const sameAs = [
    socialUrl(profile.social?.instagram, "instagram"),
    socialUrl(profile.social?.facebook, "facebook"),
    socialUrl(profile.social?.tiktok, "tiktok"),
  ].filter((url): url is string => Boolean(url));

  // Samo stvarna raster slika — favicon nije fotografija salona.
  const image = getTenantRasterImage(profile);

  // Opis entiteta sme da bude SAMO javni tekst o salonu: pun opis, pa kratka
  // brend linija. Generisani SEO fallback ("Naziv — Grad. Pogledajte usluge…")
  // ovde NE ulazi — to je snippet za SERP, a ne tvrdnja o entitetu; radije se
  // description izostavlja nego da graf nosi platformsku rečenicu.
  const businessDescription =
    normalizeCopy(profile.description) || normalizeCopy(profile.shortDescription);

  const business = {
    "@type": "BeautySalon",
    "@id": `${origin}/#business`,
    name: profile.name,
    url: origin,
    ...(businessDescription ? { description: businessDescription } : {}),
    ...(image ? { image } : {}),
    // Javno jer teme prikazuju isti broj kao tel: link.
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(profile.street ? { streetAddress: profile.street } : {}),
            ...(profile.city ? { addressLocality: profile.city } : {}),
          },
        }
      : {}),
    ...(profile.lat != null && profile.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: profile.lat,
            longitude: profile.lng,
          },
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      business,
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: profile.name,
        publisher: { "@id": `${origin}/#business` },
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: profile.name,
        isPartOf: { "@id": `${origin}/#website` },
        about: { "@id": `${origin}/#business` },
      },
    ],
  };
}
