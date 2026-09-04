/**
 * Legacy backfill sme da materijalizuje samo NEPOSTOJEĆU odluku.
 *
 * Prvi query je bio `{ "bookingIntake.enabled": { $ne: true } }`, što hvata i
 * `false`. Salon koji je namerno odštiklirao „Traži da klijentkinja pošalje
 * šta želi" dobio bi `true` nazad pri sledećem pokretanju — migracija ne bi
 * bila idempotentna nego destruktivna po admin odluku.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const SCRIPT = "scripts/backfill-service-booking-intake.mts";
const source = readFileSync(SCRIPT, "utf8");

/** Isti izbor koji skripta radi u Mongo query-ju. */
function isCandidate(service: {
  categorySlug?: string;
  bookingIntake?: { enabled?: boolean };
}) {
  const legacySlugs = ["nails"];
  const inLegacyCategory = legacySlugs.includes(service.categorySlug ?? "");
  const decisionExists = service.bookingIntake?.enabled !== undefined;
  return inLegacyCategory && !decisionExists;
}

describe("izbor kandidata za backfill", () => {
  it("bez odluke + legacy kategorija → kandidat", () => {
    expect(isCandidate({ categorySlug: "nails" })).toBe(true);
    expect(isCandidate({ categorySlug: "nails", bookingIntake: {} })).toBe(true);
  });

  it("REGRESIJA: `false` je odluka admina i NE dira se", () => {
    expect(
      isCandidate({ categorySlug: "nails", bookingIntake: { enabled: false } }),
    ).toBe(false);
  });

  it("`true` je već materijalizovano i ne dira se", () => {
    expect(
      isCandidate({ categorySlug: "nails", bookingIntake: { enabled: true } }),
    ).toBe(false);
  });

  it("kategorija van legacy politike nije kandidat", () => {
    expect(isCandidate({ categorySlug: "makeup" })).toBe(false);
    expect(isCandidate({})).toBe(false);
  });
});

describe("skripta koristi ispravan selektor", () => {
  it("bira po nepostojanju polja, ne po `$ne: true`", () => {
    expect(source).toContain('"bookingIntake.enabled": { $exists: false }');
    expect(source).not.toContain('"bookingIntake.enabled": { $ne: true }');
  });

  it("dry-run je podrazumevan — `--apply` mora biti eksplicitan", () => {
    expect(source).toContain('args.includes("--apply")');
    expect(source).toContain('!args.includes("--dry-run")');
  });
});
