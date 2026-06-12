import "server-only";

// Deterministic, code-measured SEO audit over a rendered snapshot (+ site
// signals). NO LLM — this is the high-confidence technical layer that removes
// false positives ("broken link" on a <button>, "no images found" when images
// exist as next/image, video poster, iframe or CSS background).

import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import type { SiteSignals } from "@/lib/seo/fetchSiteSignals";
import type {
  SeoFinding,
  SeoImageType,
  TechnicalAuditReport,
  TechnicalAuditSignals,
} from "@/types/seo-report";

// Image kinds that should carry an alt/text equivalent for SEO/a11y.
const ALT_REQUIRED_TYPES: SeoImageType[] = [
  "img",
  "next-image",
  "picture",
  "video-poster",
];

export interface TechnicalAuditInput {
  snapshot: LandingRenderSnapshot;
  siteSignals?: SiteSignals;
  /** Optional page key/url to tag findings with (multi-page audits). */
  page?: string;
}

export function buildTechnicalAudit(
  input: TechnicalAuditInput,
): TechnicalAuditReport {
  const { snapshot, siteSignals, page } = input;
  const source = snapshot.source ?? "cms";
  const findings: SeoFinding[] = [];

  const meta = snapshot.finalMetadata;
  const title = (meta.title ?? "").trim();
  const description = (meta.description ?? "").trim();
  const robots = (meta.robots ?? "").trim();
  const canonical = (meta.canonical ?? "").trim();

  const h1Count = snapshot.headingStructure.filter(
    (h) => h.level === "h1",
  ).length;
  const headingCount = snapshot.headingStructure.length;

  const images = snapshot.images ?? [];
  const imagesByType: Partial<Record<SeoImageType, number>> = {};
  images.forEach((img) => {
    const t = (img.type ?? "img") as SeoImageType;
    imagesByType[t] = (imagesByType[t] ?? 0) + 1;
  });
  const altRequired = images.filter((img) =>
    ALT_REQUIRED_TYPES.includes((img.type ?? "img") as SeoImageType),
  );
  const imagesMissingAlt = altRequired.filter(
    (img) => !(img.alt ?? "").trim(),
  ).length;

  const isNoindex = /noindex/i.test(robots);
  const hasSchema = (snapshot.schemas?.length ?? 0) > 0;
  const schemaTypes = (snapshot.schemas ?? []).map((s) => s.type);

  // ── Title / description ──
  if (!title) {
    findings.push({
      id: "missing-title",
      title: "Nedostaje <title>",
      detail: "Stranica nema title tag.",
      confidence: "high",
      category: "metadata",
      severity: "critical",
      fixable: true,
      page,
    });
  } else if (title.length > 60) {
    findings.push({
      id: "title-too-long",
      title: "Title predugačak",
      detail: `Title ima ${title.length} znakova (ideal 45–60).`,
      confidence: "high",
      category: "metadata",
      severity: "warning",
      fixable: true,
      page,
    });
  }
  if (!description) {
    findings.push({
      id: "missing-description",
      title: "Nedostaje meta description",
      detail: "Stranica nema meta description.",
      confidence: "high",
      category: "metadata",
      severity: "warning",
      fixable: true,
      page,
    });
  } else if (description.length > 160 || description.length < 80) {
    findings.push({
      id: "description-length",
      title: "Description dužina van ideala",
      detail: `Description ima ${description.length} znakova (ideal 120–160).`,
      confidence: "high",
      category: "metadata",
      severity: "info",
      fixable: true,
      page,
    });
  }

  // ── H1 / headings ──
  if (h1Count === 0) {
    findings.push({
      id: "missing-h1",
      title: "Nedostaje H1",
      detail: "Stranica nema H1 naslov.",
      confidence: "high",
      category: "technical",
      severity: "critical",
      fixable: true,
      page,
    });
  } else if (h1Count > 1) {
    findings.push({
      id: "multiple-h1",
      title: "Više H1 naslova",
      detail: `Pronađeno ${h1Count} H1 naslova (preporuka: jedan po strani).`,
      confidence: "high",
      category: "technical",
      severity: "warning",
      fixable: true,
      page,
    });
  }
  if (headingCount === 0) {
    findings.push({
      id: "no-headings",
      title: "Nema naslova",
      detail: "Stranica nema h1–h3 naslove.",
      confidence: "high",
      category: "technical",
      severity: "warning",
      fixable: true,
      page,
    });
  }

  // ── Canonical / robots / schema (samo kad imamo renderovani DOM) ──
  if (source === "rendered-dom") {
    if (!canonical) {
      findings.push({
        id: "missing-canonical",
        title: "Nedostaje canonical",
        detail: "Nema rel=canonical linka.",
        confidence: "high",
        category: "metadata",
        severity: "warning",
        fixable: false,
        page,
      });
    }
    if (isNoindex) {
      findings.push({
        id: "noindex-detected",
        title: "Stranica je noindex",
        detail: `robots: "${robots}" — stranica neće biti indeksirana.`,
        confidence: "high",
        category: "metadata",
        severity: "critical",
        fixable: false,
        page,
      });
    }
    if (!hasSchema) {
      findings.push({
        id: "missing-schema",
        title: "Nema schema (JSON-LD)",
        detail: "Nije pronađen structured data (schema.org).",
        confidence: "high",
        category: "technical",
        severity: "info",
        fixable: false,
        page,
      });
    }

    // ── Slike / alt ──
    if (images.length === 0) {
      findings.push({
        id: "no-images",
        title: "Nema slika",
        detail:
          "Nije pronađena nijedna slika (img / next-image / picture / video / iframe / CSS bg).",
        confidence: "high",
        category: "technical",
        severity: "info",
        fixable: false,
        page,
      });
    } else if (imagesMissingAlt > 0) {
      findings.push({
        id: "images-missing-alt",
        title: "Slike bez alt teksta",
        detail: `${imagesMissingAlt} od ${altRequired.length} slika nema alt tekst.`,
        confidence: "high",
        category: "technical",
        severity: "warning",
        fixable: true,
        page,
      });
    }
  }

  // ── Broken anchors (deterministički, prema stvarnim element id-jevima) ──
  const brokenAnchors: string[] = [];
  if (snapshot.anchors) {
    const anchorSet = new Set(snapshot.anchors);
    snapshot.internalLinks
      .filter((l) => l.href && l.href.startsWith("#") && l.href.length > 1)
      .forEach((l) => {
        const id = decodeURIComponent(l.href.slice(1));
        if (
          id &&
          id !== "top" &&
          !anchorSet.has(id) &&
          !brokenAnchors.includes(l.href)
        ) {
          brokenAnchors.push(l.href);
        }
      });
    if (brokenAnchors.length > 0) {
      findings.push({
        id: "broken-anchor",
        title: "Neispravni anchor linkovi",
        detail: `Anchor linkovi bez cilja na strani: ${brokenAnchors.join(", ")}.`,
        confidence: "medium",
        category: "technical",
        severity: "warning",
        fixable: true,
        page,
      });
    }
  }

  // ── Site signali (sitemap / robots.txt) ──
  if (siteSignals) {
    if (siteSignals.robotsBlocksAll) {
      findings.push({
        id: "robots-blocks-all",
        title: "robots.txt blokira ceo sajt",
        detail: "robots.txt sadrži Disallow: / za sve botove.",
        confidence: "high",
        category: "technical",
        severity: "critical",
        fixable: false,
        page,
      });
    }
    if (!siteSignals.hasSitemap) {
      findings.push({
        id: "missing-sitemap",
        title: "Nedostaje sitemap.xml",
        detail: "Nije pronađen validan /sitemap.xml.",
        confidence: "high",
        category: "technical",
        severity: "warning",
        fixable: false,
        page,
      });
    }
    if (!siteSignals.hasRobotsTxt) {
      findings.push({
        id: "missing-robots-txt",
        title: "Nedostaje robots.txt",
        detail: "Nije pronađen /robots.txt.",
        confidence: "high",
        category: "technical",
        severity: "info",
        fixable: false,
        page,
      });
    }
  }

  const signals: TechnicalAuditSignals = {
    h1Count,
    headingCount,
    hasTitle: !!title,
    titleLength: title.length,
    hasDescription: !!description,
    descriptionLength: description.length,
    hasCanonical: !!canonical,
    robots,
    isNoindex,
    hasSchema,
    schemaTypes,
    imageCount: images.length,
    imagesByType,
    imagesMissingAlt,
    internalLinkCount: snapshot.internalLinks.length,
    brokenAnchors,
    hasSitemap: siteSignals?.hasSitemap ?? false,
    hasRobotsTxt: siteSignals?.hasRobotsTxt ?? false,
    duplicateTitles: [],
    duplicateDescriptions: [],
  };

  return {
    findings,
    signals,
    source,
    crawlUrl: snapshot.url,
    crawlError: siteSignals?.error,
  };
}

/**
 * Cross-page duplicate metadata detection (used by the multi-page metadata flow).
 */
export function auditDuplicateMetadata(
  pages: { key: string; title?: string; description?: string }[],
): SeoFinding[] {
  const findings: SeoFinding[] = [];
  const byTitle = new Map<string, string[]>();
  const byDesc = new Map<string, string[]>();

  pages.forEach((p) => {
    const t = (p.title ?? "").trim().toLowerCase();
    const d = (p.description ?? "").trim().toLowerCase();
    if (t) byTitle.set(t, [...(byTitle.get(t) ?? []), p.key]);
    if (d) byDesc.set(d, [...(byDesc.get(d) ?? []), p.key]);
  });

  byTitle.forEach((keys) => {
    if (keys.length > 1) {
      findings.push({
        id: "duplicate-title",
        title: "Duplikat title-a",
        detail: `Iste title vrednosti na stranama: ${keys.join(", ")}.`,
        confidence: "high",
        category: "metadata",
        severity: "warning",
        fixable: true,
      });
    }
  });
  byDesc.forEach((keys) => {
    if (keys.length > 1) {
      findings.push({
        id: "duplicate-description",
        title: "Duplikat description-a",
        detail: `Iste description vrednosti na stranama: ${keys.join(", ")}.`,
        confidence: "high",
        category: "metadata",
        severity: "warning",
        fixable: true,
      });
    }
  });

  return findings;
}
