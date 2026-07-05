/**
 * Zaglavlja za server-to-server pozive ka internim rutama (/api/internal/*,
 * auth refresh). Env se čita PRI IMPORTU (VERCEL_BYPASS_HEADERS) — testovi
 * stubuju env pa rade svež import modula.
 */

// Vercel preview + Deployment Protection: interni middleware fetch-evi (resolve
// tenant/domena, token refresh) nemaju browser kolačić pa ih auth zid na
// preview-u blokira iako browser prolazi. Secret postoji kad se u Vercel
// Settings → Deployment Protection uključi "Protection Bypass for Automation".
export const VERCEL_BYPASS_HEADERS: Record<string, string> = process.env
  .VERCEL_AUTOMATION_BYPASS_SECRET
  ? {
      "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    }
  : {};

/** Headeri za interne server-to-server fetch-eve: internal secret + preview bypass. */
export function INTERNAL_FETCH_HEADERS(): Record<string, string> {
  return {
    "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
    ...VERCEL_BYPASS_HEADERS,
  };
}
