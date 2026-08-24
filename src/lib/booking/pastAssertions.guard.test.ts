import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: test koji tvrdi nešto o `past` MORA proslediti eksplicitno `now`.
 *
 * Zašto: `past` se računa u odnosu na „sada". Bez `now` test koristi stvarni
 * sat, pa radi tačno dok je fikstura u budućnosti — a onda tiho počne da pada
 * kad ga kalendar stigne. Tako je pao `„ručni termin nosi svoje trajanje"`:
 * fikstura je bila `2026-08-24`, a termin u 10:00; tog dana posle 10 ujutru
 * motor je ispravno rekao `past: true`, dok je test i dalje tvrdio `false`.
 *
 * Granica: ovo važi za TESTOVE. U proizvodu `firstAvailableDate` namerno ima
 * podrazumevano `now` — traženje prvog slobodnog dana uvek preskače prošlost.
 * Guard ne dira izvorni kod.
 */

const PAST_ASSERTION = /\bpast\s*:/;
const EXPLICIT_NOW = /\bnow\s*:/;
const BLOCK_START = /\b(?:it|test)\s*(?:\.\w+)?\s*\(/g;

/** Deli fajl na `it(...)` blokove — tvrdnje žive unutar svog testa. */
export function blocksWithUnpinnedPast(
  source: string,
): { name: string; index: number }[] {
  const starts: number[] = [];
  for (const match of source.matchAll(BLOCK_START)) {
    starts.push(match.index);
  }

  const offenders: { name: string; index: number }[] = [];
  starts.forEach((start, i) => {
    const block = source.slice(start, starts[i + 1] ?? source.length);
    if (!PAST_ASSERTION.test(block)) return;
    if (EXPLICIT_NOW.test(block)) return;
    const name = block.match(/["'`](.+?)["'`]/)?.[1] ?? "(bez imena)";
    offenders.push({ name, index: start });
  });
  return offenders;
}

function testFiles(): string[] {
  const files: string[] = [];
  const visit = (relative: string) => {
    for (const entry of readdirSync(path.join(process.cwd(), relative))) {
      const next = path.join(relative, entry);
      const absolute = path.join(process.cwd(), next);
      if (statSync(absolute).isDirectory()) {
        if (entry === "node_modules") continue;
        visit(next);
      } else if (/\.test\.tsx?$/.test(entry)) {
        files.push(next);
      }
    }
  };
  visit("src");
  return files;
}

describe("tvrdnje o `past` moraju biti vremenski fiksirane", () => {
  it("detektor stvarno hvata prekršaj", () => {
    // Bez ovoga bi guard mogao da „prolazi" samo zato što mu regex ne hvata ništa.
    const bad = `it("truli sa kalendarom", () => {
      expect(slots).toEqual([{ time: "10:00", past: false }]);
    });`;
    expect(blocksWithUnpinnedPast(bad).map((o) => o.name)).toEqual([
      "truli sa kalendarom",
    ]);
  });

  it("test sa eksplicitnim `now` nije prekršaj", () => {
    const good = `it("prošlo se razlikuje od zauzetog", () => {
      const states = daySlotStates(grid({ now: new Date("2026-08-24T08:30:00Z") }));
      expect(states[0]).toMatchObject({ past: true });
    });`;
    expect(blocksWithUnpinnedPast(good)).toEqual([]);
  });

  it("nijedan test u repozitorijumu ne tvrdi `past` bez `now`", () => {
    const offenders = testFiles().flatMap((file) => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      // Sam guard sadrži namerne primere prekršaja u stringovima.
      if (file.endsWith("pastAssertions.guard.test.ts")) return [];
      return blocksWithUnpinnedPast(source).map((o) => `${file} → "${o.name}"`);
    });

    expect(
      offenders,
      "Test tvrdi `past`, a ne prosleđuje `now` — počeće da pada kada ga " +
        "kalendar stigne. Dodaj `now:` u isti `it` blok (npr. `now: LONG_AGO`).",
    ).toEqual([]);
  });
});
