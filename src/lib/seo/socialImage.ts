/**
 * Izbor slike za OpenGraph/Twitter kartice tenant sajta.
 *
 * Zašto postoji: `profile.logo` je logo SAJTA i sme da bude SVG (Cloudinary).
 * Facebook, LinkedIn, X i Slack ne renderuju SVG u social preview-u — kartica
 * ostane bez slike. Zato social metadata sme da koristi SAMO raster.
 *
 * Isti problem je već rešen za push/mejl/PWA kroz `usableRasterLogo`, ali ta
 * provera je NEGATIVNA ("nije .svg"). Za social koristimo POZITIVNU listu
 * dozvoljenih formata: bolje je pasti na favicon nego poslati crawler-u nešto
 * što ne ume da prikaže. Cloudinary `secure_url` uvek nosi ekstenziju, pa je
 * provera po ekstenziji pouzdana za sve slike koje je aplikacija otpremila.
 *
 * INVARIJANTA: u ovaj lanac NIKAD ne sme da uđe Marysoll marketinški asset
 * (npr. /create-your-salon.png). Tenant sajt predstavlja salon, ne platformu —
 * zato je poslednji fallback tenantov /favicon.ico, koji proxy razrešava na
 * logo tog salona.
 */

import type { SalonProfileData } from "@/types";
import { getCanonicalUrl, type PublicSiteContext } from "./public-site";

/** Formati koje social crawleri pouzdano renderuju. */
export const RASTER_SOCIAL_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
] as const;

/**
 * Da li je URL raster slika prihvatljiva za social karticu.
 * Namerno "fail closed": nepoznat/bez ekstenzije → ne koristi se.
 */
export function isRasterSocialImage(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const clean = url.trim();
  if (clean === "") return false;

  // Odbaci query/hash pre čitanja ekstenzije
  // (…/logo.png?v=2 i …/logo.png#x su i dalje PNG).
  const withoutQuery = clean.split(/[?#]/)[0];
  const extension = withoutQuery.split(".").pop()?.toLowerCase();
  if (!extension) return false;

  return (RASTER_SOCIAL_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * Slika za og:image / twitter:image, uvek tenant-scoped.
 *
 * Redosled:
 *   1. `notificationLogo` — pipeline koji GARANTUJE raster (upload odbija SVG),
 *      pa je to najpouzdaniji automatski izvor;
 *   2. `logo` — samo ako je raster (isti ustupak koji već pravi mejl layout);
 *   3. tenantov `/favicon.ico` na kanonskom originu.
 *
 * Nema koraka koji bi mogao da vrati platformski asset.
 */
export function getTenantSocialImage(
  profile: Pick<SalonProfileData, "logo" | "notificationLogo"> | null,
  context: PublicSiteContext,
): string {
  if (isRasterSocialImage(profile?.notificationLogo)) {
    return profile!.notificationLogo as string;
  }
  if (isRasterSocialImage(profile?.logo)) {
    return profile!.logo as string;
  }
  return getCanonicalUrl(context, "/favicon.ico");
}
