/**
 * SEO health — čista procena kvaliteta metapodataka jednog tenanta.
 *
 * Ovo su SAVETI, ne greške: salon sa slabim SEO profilom mora i dalje da može
 * da objavi sajt. Automatski minimum je dužnost platforme (kanonski URL,
 * structured data, fallback opis), a ručno unet SEO je bolji i ovo služi da se
 * vidi kome vredi predložiti da ga unese.
 *
 * Namerno bez ijednog upita ka bazi i bez AI poziva — ulaz su već učitana
 * javna polja profila. Kolektor (src/lib/diagnostics/integrity) ovo prevodi u
 * IntegrityFinding i uključuje u postojeći health report.
 */

import type { SalonProfileData } from "@/types";
import { getTenantRasterImage } from "./socialImage";
import { resolveTenantDescription, normalizeCopy } from "./metadataFallback";

export type SeoHealthCode =
  | "seo.title.missing"
  | "seo.description.missing"
  | "seo.description.generated"
  | "seo.profile.descriptionMissing"
  | "seo.profile.cityMissing"
  | "seo.social.profilesMissing"
  | "seo.social.imageFallback"
  | "seo.social.rasterLogoMissing"
  | "seo.identity.incomplete";

export type SeoHealthSeverity = "warning" | "info";

export interface SeoHealthIssue {
  code: SeoHealthCode;
  severity: SeoHealthSeverity;
  message: string;
  /** Šta vlasnik/admin treba da uradi. */
  hint: string;
}

/** Stranice sa zasebnim ručnim SEO poljima. */
const SEO_PAGES = [
  { key: "home", label: "početna" },
  { key: "usluge", label: "usluge" },
  { key: "termini", label: "termini" },
] as const;

function manualField(
  profile: SalonProfileData,
  page: string,
  kind: "Title" | "Description",
): string {
  const seo = profile.seo as Record<string, string> | undefined;
  return normalizeCopy(seo?.[`${page}${kind}`]);
}

/**
 * Procena javnog SEO profila tenanta. Vraća listu saveta — prazna lista znači
 * da je profil kompletan.
 */
export function evaluateSeoHealth(
  profile: SalonProfileData | null,
): SeoHealthIssue[] {
  const issues: SeoHealthIssue[] = [];
  if (!profile) {
    return [
      {
        code: "seo.identity.incomplete",
        severity: "warning",
        message: "Profil salona nije dostupan — structured data se ne generiše.",
        hint: "Popuniti profil salona (naziv je minimum).",
      },
    ];
  }

  const name = normalizeCopy(profile.name);
  const city = normalizeCopy(profile.city);
  const description = normalizeCopy(profile.description);
  const shortDescription = normalizeCopy(profile.shortDescription);

  // ── Ručni SEO ────────────────────────────────────────────────────────────
  const missingTitles = SEO_PAGES.filter(
    (page) => !manualField(profile, page.key, "Title"),
  );
  if (missingTitles.length > 0) {
    issues.push({
      code: "seo.title.missing",
      severity: "info",
      message: `Nema ručno unetog SEO naslova za: ${missingTitles
        .map((p) => p.label)
        .join(", ")}.`,
      hint: "Uneti naslov u podešavanjima salona — ručni naslov uvek pobeđuje automatski.",
    });
  }

  const missingDescriptions = SEO_PAGES.filter(
    (page) => !manualField(profile, page.key, "Description"),
  );
  if (missingDescriptions.length > 0) {
    issues.push({
      code: "seo.description.missing",
      severity: "info",
      message: `Nema ručno unetog SEO opisa za: ${missingDescriptions
        .map((p) => p.label)
        .join(", ")}.`,
      hint: "Uneti opis u podešavanjima salona — ručni opis uvek pobeđuje automatski.",
    });
  }

  // ── Kvalitet automatskog opisa ───────────────────────────────────────────
  if (!description && !shortDescription) {
    issues.push({
      code: "seo.profile.descriptionMissing",
      severity: "warning",
      message: "Salon nema javni opis — automatski opis se svodi na činjenice.",
      hint: "Dodati opis salona; koristi se i na sajtu i u structured data.",
    });
  }

  // Da li početna trenutno pada na determinističku rečenicu.
  const homeDescription = resolveTenantDescription(
    manualField(profile, "home", "Description"),
    {
      name: profile.name,
      description: profile.description,
      shortDescription: profile.shortDescription,
      city: profile.city,
    },
  );
  const usingGeneratedFallback =
    !manualField(profile, "home", "Description") &&
    !description &&
    !shortDescription &&
    homeDescription.length > 0;
  if (usingGeneratedFallback) {
    issues.push({
      code: "seo.description.generated",
      severity: "warning",
      message:
        "Meta opis početne se generiše iz naziva i grada — nema stvarnog teksta o salonu.",
      hint: "Uneti SEO opis ili opis salona.",
    });
  }

  if (!city) {
    issues.push({
      code: "seo.profile.cityMissing",
      severity: "warning",
      message:
        "Nema grada — lokalna pretraga i structured data ostaju bez lokacije.",
      hint: "Uneti grad u profilu salona.",
    });
  }

  // ── Social ───────────────────────────────────────────────────────────────
  const rasterImage = getTenantRasterImage(profile);
  if (!rasterImage) {
    issues.push({
      code: "seo.social.imageFallback",
      severity: "warning",
      message:
        "Social kartica pada na favicon — nema raster slike za og:image.",
      hint: "Otpremiti logo za notifikacije (PNG/JPG/WEBP); koristi se i za deljenje linkova.",
    });
  }
  if (!profile.notificationLogo) {
    issues.push({
      code: "seo.social.rasterLogoMissing",
      severity: "info",
      message: "Nema logo-a za notifikacije (raster).",
      hint: "Otpremiti raster logo — koristi se za push, mejl, PWA ikonu i social karticu.",
    });
  }

  const hasSocial = Boolean(
    normalizeCopy(profile.social?.instagram) ||
      normalizeCopy(profile.social?.facebook) ||
      normalizeCopy(profile.social?.tiktok),
  );
  if (!hasSocial) {
    issues.push({
      code: "seo.social.profilesMissing",
      severity: "info",
      message:
        "Nema nijednog javnog profila na mrežama — sameAs u structured data ostaje prazan.",
      hint: "Uneti Instagram/TikTok/Facebook; potvrđuju da je reč o istom salonu.",
    });
  }

  // ── Identitet entiteta ───────────────────────────────────────────────────
  if (!name) {
    issues.push({
      code: "seo.identity.incomplete",
      severity: "warning",
      message: "Salon nema naziv — structured data ne može da opiše entitet.",
      hint: "Uneti naziv salona.",
    });
  }

  return issues;
}
