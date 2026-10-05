import type { NewsletterVariable } from "@/types";

/** Older or imported templates may describe long content as plain text. */
export function isMultilineNewsletterField(variable: NewsletterVariable): boolean {
  if (variable.type === "textarea") return true;
  if (variable.type !== "text") return false;

  const words = variable.name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[\s_-]+/);
  if (["title", "subtitle", "name", "subject", "label", "url", "slug"].includes(words.at(-1) ?? "")) return false;

  return words.some((word) =>
    ["description", "body", "content", "summary", "instructions", "prompt", "intro", "opis", "sadrzaj", "sadržaj"].includes(word),
  ) || ["heroText", "mainText", "message"].includes(variable.name);
}
