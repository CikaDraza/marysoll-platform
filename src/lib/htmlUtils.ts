// lib/htmlUtils.ts
export function cleanEmailHtml(html: string): string {
  let cleaned = html.trim();

  // Ukloni Markdown code blockove (```html, ```)
  if (cleaned.startsWith("```html")) {
    cleaned = cleaned
      .replace(/^```html\n?/, "")
      .replace(/```$/, "")
      .trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
  }

  // Ukloni <!DOCTYPE>, <html>, <head>, <body> tagove ako postoje
  cleaned = cleaned
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .replace(/<html[^>]*>/i, "")
    .replace(/<\/html>/i, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/i, "")
    .replace(/<body[^>]*>/i, "")
    .replace(/<\/body>/i, "");

  // Ukloni komentare <!-- ... -->
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  return cleaned.trim();
}
