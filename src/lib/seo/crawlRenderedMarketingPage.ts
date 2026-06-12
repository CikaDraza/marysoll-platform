import "server-only";

import type { LandingRenderSnapshot } from "@/lib/seo/marketingLandingSnapshot";
import type { PerformanceSeoSnapshot } from "@/types/marketing-landing";

interface BrowserlessFunctionResponse {
  data?: LandingRenderSnapshot;
  error?: string;
}

function isBrowserlessFunctionResponse(
  payload: BrowserlessFunctionResponse | LandingRenderSnapshot,
): payload is BrowserlessFunctionResponse {
  return "data" in payload || "error" in payload;
}

function getBrowserlessFunctionUrl() {
  const explicit = process.env.BROWSERLESS_FUNCTION_URL;
  if (explicit) return explicit;

  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) return null;

  const base =
    process.env.BROWSERLESS_ENDPOINT ?? "https://production-sfo.browserless.io";
  return `${base.replace(/\/$/, "")}/function?token=${encodeURIComponent(token)}`;
}

export async function crawlRenderedMarketingPage(
  url: string,
  performance?: PerformanceSeoSnapshot,
  pageName = "marketing-home",
): Promise<LandingRenderSnapshot> {
  const functionUrl = getBrowserlessFunctionUrl();
  if (!functionUrl) {
    throw new Error("Browserless is not configured");
  }

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { url, performance, pageName },
      code: `
export default async ({ page, context }) => {
  const targetUrl = context.url;
  await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 45000 });
  await page.waitForTimeout(1200);

  const snapshot = await page.evaluate(({ targetUrl, performance, pageName }) => {
    const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) !== 0 &&
        rect.width > 0 &&
        rect.height > 0;
    };
    const abs = (value) => {
      if (!value) return "";
      try { return new URL(value, window.location.href).toString(); }
      catch { return value; }
    };
    const isInternal = (href) => {
      if (!href) return false;
      if (href.startsWith("#") || href.startsWith("/")) return true;
      try { return new URL(href, window.location.href).origin === window.location.origin; }
      catch { return false; }
    };
    const textOf = (element) => clean(element.innerText || element.textContent || "");
    const meta = (selector, attr = "content") =>
      document.querySelector(selector)?.getAttribute(attr) || "";

    // Collect images from ALL real sources, not just <img>.
    const collectImages = (root) => {
      const out = [];
      Array.from(root.querySelectorAll("img"))
        .filter(isVisible)
        .forEach((el) => {
          out.push({
            type: "img",
            src: abs(el.getAttribute("src") || el.getAttribute("data-src") || ""),
            alt: clean(el.getAttribute("alt") || ""),
          });
        });
      Array.from(root.querySelectorAll("picture source")).forEach((el) => {
        const srcset = el.getAttribute("srcset") || "";
        const first = (srcset.split(",")[0] || "").trim().split(" ")[0] || "";
        if (first) out.push({ type: "picture", src: abs(first), alt: "" });
      });
      Array.from(root.querySelectorAll("video[poster]"))
        .filter(isVisible)
        .forEach((el) => {
          out.push({
            type: "video-poster",
            src: abs(el.getAttribute("poster") || ""),
            alt: "",
          });
        });
      Array.from(root.querySelectorAll("iframe[src]"))
        .filter(isVisible)
        .forEach((el) => {
          out.push({
            type: "iframe",
            src: abs(el.getAttribute("src") || ""),
            alt: clean(el.getAttribute("title") || ""),
          });
        });
      Array.from(root.querySelectorAll("*"))
        .slice(0, 4000)
        .filter(isVisible)
        .forEach((el) => {
          const bg = window.getComputedStyle(el).backgroundImage;
          if (bg && bg !== "none" && bg.indexOf("url(") !== -1) {
            const match = bg.match(/url\\((['"]?)(.*?)\\1\\)/);
            if (match && match[2] && match[2].indexOf("data:") !== 0) {
              out.push({ type: "background-image", src: abs(match[2]), alt: "" });
            }
          }
        });
      const seen = {};
      return out.filter((img) => {
        if (!img.src) return false;
        const key = img.type + "|" + img.src;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
    };

    const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
      .filter(isVisible)
      .map((element) => ({
        level: element.tagName.toLowerCase(),
        text: textOf(element),
      }))
      .filter((heading) => heading.text);

    const links = Array.from(document.querySelectorAll("a[href]"))
      .filter(isVisible)
      .map((element) => ({
        text: textOf(element),
        href: abs(element.getAttribute("href") || ""),
      }))
      .filter((link) => link.text || link.href);

    const buttons = Array.from(document.querySelectorAll("button"))
      .filter(isVisible)
      .map((element) => ({ text: textOf(element), href: "" }))
      .filter((button) => button.text);

    const ctas = [...links, ...buttons].filter((item) => {
      const text = item.text.toLowerCase();
      return /počni|pocni|start|trial|besplat|demo|saznaj|kontakt|register|odaberi|plan|zakaz/i.test(text);
    });

    const images = collectImages(document);
    const anchors = Array.from(document.querySelectorAll("[id]"))
      .map((element) => element.id)
      .filter(Boolean);

    const decorativeElements = Array.from(
      document.querySelectorAll("[aria-hidden='true'], .blur-3xl, [class*='blur-3xl'], [class*='gradient']")
    )
      .filter(isVisible)
      .slice(0, 20)
      .map((element) => ({
        selector: element.tagName.toLowerCase(),
        reason: "Decorative HTML/CSS/motion element, not an image asset.",
      }));

    const schemas = Array.from(document.querySelectorAll("script[type='application/ld+json']"))
      .map((element) => {
        const raw = clean(element.textContent || "");
        let type = "JsonLd";
        try {
          const parsed = JSON.parse(element.textContent || "{}");
          type = Array.isArray(parsed) ? "JsonLd[]" : parsed["@type"] || "JsonLd";
        } catch {}
        return { type, raw };
      })
      .filter((schema) => schema.raw);

    const sectionNodes = Array.from(document.querySelectorAll("header,main section,section,footer"))
      .filter(isVisible);

    const sections = sectionNodes.map((section, index) => {
      const sectionHeadings = Array.from(section.querySelectorAll("h1,h2,h3"))
        .filter(isVisible)
        .map((element) => ({
          level: element.tagName.toLowerCase(),
          text: textOf(element),
        }))
        .filter((heading) => heading.text);
      const sectionLinks = Array.from(section.querySelectorAll("a[href]"))
        .filter(isVisible)
        .map((element) => ({
          text: textOf(element),
          href: abs(element.getAttribute("href") || ""),
        }))
        .filter((link) => link.text || link.href);
      const sectionImages = collectImages(section);

      return {
        id: section.id || section.getAttribute("data-section") || section.tagName.toLowerCase() + "-" + (index + 1),
        enabled: true,
        heading: sectionHeadings[0],
        visibleCopy: textOf(section).split(/(?<=[.!?])\\s+/).map(clean).filter(Boolean).slice(0, 16),
        ctas: sectionLinks.filter((link) => ctas.some((cta) => cta.href === link.href && cta.text === link.text)),
        images: sectionImages,
        internalLinks: sectionLinks.filter((link) => isInternal(link.href)),
      };
    }).filter((section) => section.visibleCopy.length || section.heading || section.images.length);

    const visibleCopy = Array.from(document.querySelectorAll("main,section,article,header,footer"))
      .filter(isVisible)
      .map(textOf)
      .filter(Boolean)
      .slice(0, 80);

    return {
        page: pageName,
      source: "rendered-dom",
      url: window.location.href,
      sections,
      headingStructure: headings,
      visibleCopy,
      ctas,
      internalLinks: links.filter((link) => isInternal(link.href)),
      images,
      anchors,
      decorativeElements,
      schemas,
      businessContext: {
        brand: "Marysoll",
        productCategory: "Salon booking and management software",
        audience: "Beauty salons and small beauty businesses",
      },
      pricingPlans: [],
      finalMetadata: {
        title: clean(document.title),
        description: meta("meta[name='description']"),
        ogImage: abs(meta("meta[property='og:image']")),
        ogTitle: meta("meta[property='og:title']") || clean(document.title),
        ogDescription: meta("meta[property='og:description']") || meta("meta[name='description']"),
        canonical: abs(document.querySelector("link[rel='canonical']")?.getAttribute("href") || window.location.href),
        robots: meta("meta[name='robots']") || "index,follow",
      },
      performance,
    };
  }, { targetUrl, performance: context.performance, pageName: context.pageName });

  return { data: snapshot, type: "application/json" };
};
      `.trim(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Browserless crawl failed: ${response.status} - ${error}`);
  }

  const payload = (await response.json()) as
    | BrowserlessFunctionResponse
    | LandingRenderSnapshot;
  const snapshot = isBrowserlessFunctionResponse(payload)
    ? payload.data
    : payload;
  if (!snapshot) {
    throw new Error(
      isBrowserlessFunctionResponse(payload) && payload.error
        ? payload.error
        : "Browserless returned no snapshot",
    );
  }
  return snapshot;
}
