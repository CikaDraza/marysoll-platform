/**
 * Normalise a CMS href against a tenant base path.
 *
 * Anchors ("#booking") and external/protocol links (http, https, mailto, tel,
 * protocol-relative) are returned untouched; only internal paths get the base
 * prefix. Use this instead of `${base}/${href}` so anchors/external links the
 * salon owner enters in the CMS aren't mangled into "${base}/#booking".
 *
 * Plain (non-"use client") module so it can run in both server and client
 * components — the AnchorLink component lives in a separate client module.
 */
export function resolveThemeHref(href: string, base = ""): string {
  if (!href) return href;
  if (href.startsWith("#") || href.startsWith("//")) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href; // http:, mailto:, tel:, …
  const path = href.startsWith("/") ? href : `/${href}`;
  return `${base}${path}`;
}
