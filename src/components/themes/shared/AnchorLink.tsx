"use client";

import { useCallback } from "react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import Link from "next/link";

/**
 * Resolve an href to the in-page element id it targets, or null when the link
 * points somewhere else (another route, an external site, mailto, …).
 *
 * Accepts bare hashes ("#services"), path+hash ("/usluge#services") and full
 * URLs ("https://site.com/#services"). Only same-document targets scroll.
 */
function inPageHash(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("#")) return href.slice(1);
  try {
    const url = new URL(href, window.location.href);
    const samePage =
      url.origin === window.location.origin &&
      url.pathname === window.location.pathname;
    return samePage && url.hash ? url.hash.slice(1) : null;
  } catch {
    return null;
  }
}

interface Props extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string;
  children: ReactNode;
  /** Sticky/fixed header height to clear so the target heading isn't hidden. */
  offset?: number;
}

/**
 * Same-page anchor link that smooth-scrolls reliably.
 *
 * Why not a plain <Link href="#services">: in the App Router a bare hash gets
 * resolved against the current URL (which may already carry a hash) and grows
 * into "#services#services"; and re-clicking a link whose href equals the
 * current URL is a no-op (no hashchange → no scroll). We intercept same-document
 * targets and scroll manually so it fires on every click. Cross-page / external
 * hrefs fall through to the normal <Link>.
 */
export function AnchorLink({
  href,
  children,
  onClick,
  offset = 80,
  ...rest
}: Props) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      // Let modified clicks (open-in-new-tab, etc.) behave natively.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const id = inPageHash(href);
      if (id === null) return;

      // "#top" / "#" target the top of the page even with no matching element.
      const el = id ? document.getElementById(id) : null;
      if (!el && id !== "top" && id !== "") return;

      e.preventDefault();
      const top = el
        ? el.getBoundingClientRect().top + window.scrollY - offset
        : 0;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      // Keep the URL shareable without re-triggering the native jump, and skip
      // stacking duplicate history entries when the hash is already set.
      const nextHash = id ? `#${id}` : "";
      if (nextHash && window.location.hash !== nextHash) {
        history.pushState(null, "", nextHash);
      }
    },
    [href, onClick, offset],
  );

  return (
    <Link href={href} {...rest} onClick={handleClick}>
      {children}
    </Link>
  );
}
