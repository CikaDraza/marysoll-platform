/**
 * Kontrakt Diagnostic Engine-a — jedan izvor istine za oblik rezultata.
 * Potrošači (Marysoll API rute, UI) uvoze OVE tipove; storage format u bazi
 * je kompatibilan sa istorijskim reportima (Mixed polje).
 *
 * Pravilo #1: dijagnostika NIKAD ne sme da sruši host aplikaciju — svaki
 * collector/probe hvata svoje greške i vraća "fail" rezultat umesto throw-a.
 */

export type ModuleState =
  /** prelazno stanje za živi UI prikaz — završen report ga ne sadrži */
  | "pending"
  | "ok"
  | "warn"
  | "fail"
  | "info";

export interface ModuleResult {
  /** "device" | "push" | "storage" | "permissions" | network probe key ("base", "admin"…) */
  key: string;
  /** Ljudski naziv za UI/support */
  name: string;
  state: ModuleState;
  /** Trajanje merenja gde ima smisla (network probes), inače null */
  ms: number | null;
  /** Kratko objašnjenje — uvek ograničeno na DETAIL_MAX */
  detail: string | null;
  /** Strukturirani podaci modula — ograničeno na DATA_JSON_MAX po modulu */
  data?: Record<string, unknown>;
}

export interface DiagnosticReport {
  /** Slobodna oznaka (npr. ?u= ime korisnice iz support linka) */
  label: string | null;
  /** Host sa kog je dijagnostika pokrenuta */
  pageHost: string;
  results: ModuleResult[];
}

/** Tvrdi cap-ovi — write endpoint ima limit payload-a (20 KB), ne smemo da ga naduvamo. */
export const DETAIL_MAX = 300;
export const DATA_JSON_MAX = 2000;

export function capDetail(detail: string | null | undefined): string | null {
  if (detail == null) return null;
  return detail.slice(0, DETAIL_MAX);
}

/** Vraća data samo ako serijalizovano staje u cap; inače marker umesto podataka. */
export function capData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  try {
    return JSON.stringify(data).length <= DATA_JSON_MAX
      ? data
      : { truncated: true };
  } catch {
    return { unserializable: true };
  }
}
