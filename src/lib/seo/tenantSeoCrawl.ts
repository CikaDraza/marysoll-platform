import "server-only";

import { Tenant } from "@/models/Tenant";
import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import { crawlRenderedMarketingPage } from "@/lib/seo/crawlRenderedMarketingPage";
import { tenantOrigin } from "@/lib/platform/host-context";

export type TenantSeoPageKey = "home" | "services" | "appointments";

export interface TenantSeoPageSnapshot {
  page: TenantSeoPageKey;
  url: string;
  snapshot?: LandingRenderSnapshot;
  error?: string;
}

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

export async function resolveTenantLandingCrawlUrl(tenantId: string) {
  const tenant = (await Tenant.findById(tenantId)
    .select("slug customDomain customDomainVerified")
    .lean()) as {
    slug?: string;
    customDomain?: string | null;
    customDomainVerified?: boolean;
  } | null;

  if (!tenant?.slug) throw new Error("Tenant nije pronađen");

  // Crawl-uje se sajt OVOG okruženja (na staging-u staging kopija, ne prod).
  return tenantOrigin({ ...tenant, slug: tenant.slug });
}

function buildTenantSeoPageUrls(homeUrl: string) {
  const base = trimSlash(homeUrl);
  return {
    home: base,
    services: `${base}/usluge`,
    appointments: `${base}/termini`,
  } satisfies Record<TenantSeoPageKey, string>;
}

export async function crawlTenantSeoPages(homeUrl: string) {
  const urls = buildTenantSeoPageUrls(homeUrl);
  const entries = Object.entries(urls) as [TenantSeoPageKey, string][];

  // Crawl sequentially: Browserless caps concurrent sessions and returns 429 at
  // its gateway when these pages are requested in parallel.
  const results: TenantSeoPageSnapshot[] = [];
  for (const [page, url] of entries) {
    try {
      const snapshot = await crawlRenderedMarketingPage(url, undefined, page);
      results.push({ page, url, snapshot });
    } catch (err) {
      results.push({
        page,
        url,
        error: err instanceof Error ? err.message : "Rendered crawl failed",
      });
    }
  }
  return results;
}
