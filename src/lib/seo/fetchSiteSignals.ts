import "server-only";

// Deterministic site-level SEO signals fetched without a headless browser.
// Checks /sitemap.xml and /robots.txt for a given page URL's origin.

export interface SiteSignals {
  hasSitemap: boolean;
  sitemapUrl?: string;
  hasRobotsTxt: boolean;
  robotsBlocksAll: boolean;
  robotsReferencesSitemap: boolean;
  error?: string;
}

function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/$/, "");
  }
}

async function getText(
  url: string,
  timeoutMs = 8000,
): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    const text = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeSitemap(text: string): boolean {
  return text.includes("<urlset") || text.includes("<sitemapindex");
}

function robotsBlocksAll(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim().toLowerCase());
  let inStarGroup = false;
  for (const line of lines) {
    if (line.startsWith("user-agent:")) {
      inStarGroup = line.includes("*");
    } else if (inStarGroup && line === "disallow: /") {
      return true;
    }
  }
  return false;
}

export async function fetchSiteSignals(pageUrl: string): Promise<SiteSignals> {
  const base = toOrigin(pageUrl);

  try {
    const [sitemap, robots] = await Promise.all([
      getText(`${base}/sitemap.xml`),
      getText(`${base}/robots.txt`),
    ]);

    return {
      hasSitemap: sitemap.ok && looksLikeSitemap(sitemap.text),
      sitemapUrl: sitemap.ok ? `${base}/sitemap.xml` : undefined,
      hasRobotsTxt: robots.ok && robots.text.trim().length > 0,
      robotsBlocksAll: robots.ok ? robotsBlocksAll(robots.text) : false,
      robotsReferencesSitemap: robots.ok
        ? /sitemap:/i.test(robots.text)
        : false,
    };
  } catch (err) {
    return {
      hasSitemap: false,
      hasRobotsTxt: false,
      robotsBlocksAll: false,
      robotsReferencesSitemap: false,
      error: err instanceof Error ? err.message : "site signals fetch failed",
    };
  }
}
