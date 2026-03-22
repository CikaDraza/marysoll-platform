// lib/templateUtils.ts
import { NewsletterVariable } from "@/types";

/**
 * Izvlači varijable iz HTML templejta i mapira ih na poznate definicije
 */
export function extractVariablesFromHtml(
  html: string,
  knownVariables: NewsletterVariable[] = []
): NewsletterVariable[] {
  // 1. Pronađi sve {{varijabla}} u HTML-u
  const matches = html.match(/{{([^}]+)}}/g) || [];
  const uniqueVarNames = [
    ...new Set(matches.map((m) => m.slice(2, -2).trim())),
  ];

  // 2. Kreiraj mapu poznatih varijabli za brzi lookup
  const knownMap = new Map<string, NewsletterVariable>();
  knownVariables.forEach((v) => knownMap.set(v.name, v));

  // 3. Interne varijable koje ne prikazujemo u formi
  const hiddenVars = new Set([
    "trackingCtaUrl",
    "trackingOpenUrl",
    "unsubscribeUrl",
  ]);

  // 4. Generiši listu za prikaz u formi
  return uniqueVarNames
    .filter((name) => !hiddenVars.has(name))
    .map((name) => {
      const known = knownMap.get(name);

      if (known) {
        return {
          name: known.name,
          label: known.label,
          type: known.type as NewsletterVariable["type"],
          placeholder: known.placeholder,
          required: known.required,
        };
      }

      // Ako nije u standardnoj listi – generiši generičku
      return {
        name,
        label:
          name.charAt(0).toUpperCase() +
          name.slice(1).replace(/([A-Z])/g, " $1"),
        type: "text" as const,
        placeholder: `Unesite ${name}`,
      };
    });
}
