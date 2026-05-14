import type { ReactNode } from "react";
import type { AboutTextLink } from "@/types";

const linkClassName =
  "text-indigo-600 font-medium underline underline-offset-2 hover:text-indigo-700";

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function renderLinkedText(
  text: string,
  links: AboutTextLink[] = [],
): ReactNode[] {
  const validLinks = links.filter((link) => link.text.trim());
  const nodes: ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let next:
      | { index: number; link: AboutTextLink }
      | null = null;

    for (const link of validLinks) {
      const index = text.indexOf(link.text, cursor);
      if (index === -1) continue;
      if (!next || index < next.index) next = { index, link };
    }

    if (!next) {
      nodes.push(text.slice(cursor));
      break;
    }

    if (next.index > cursor) {
      nodes.push(text.slice(cursor, next.index));
    }

    const label = text.slice(next.index, next.index + next.link.text.length);
    const href = normalizeUrl(next.link.url);

    nodes.push(
      href ? (
        <a
          key={`${next.index}-${next.link.text}-${nodes.length}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {label}
        </a>
      ) : (
        <span
          key={`${next.index}-${next.link.text}-${nodes.length}`}
          className="text-indigo-600 font-medium"
        >
          {label}
        </span>
      ),
    );

    cursor = next.index + next.link.text.length;
  }

  return nodes;
}
