/**
 * Newsletter template previews run in an iframe. An unfilled {{mainImage}}
 * token would otherwise be requested by the browser as a relative URL.
 * This is preview-only: stored HTML and email delivery semantics stay intact.
 */
export const EMPTY_MAIN_IMAGE_PREVIEW_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='630' viewBox='0 0 1200 630'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial,sans-serif' font-size='32'%3EGlavna slika nije izabrana%3C/text%3E%3C/svg%3E";

export function renderNewsletterPreviewHtml(html: string): string {
  return html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*["'])\{\{\s*mainImage\s*\}\}(["'][^>]*>)/gi,
    `$1${EMPTY_MAIN_IMAGE_PREVIEW_SRC}$2`,
  );
}
