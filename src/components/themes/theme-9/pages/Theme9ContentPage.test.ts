import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `/za-klijente` i `/za-profesionalce` renderuje jedna komponenta, pa sve
 * njene sekcije moraju stajati u ISTOM kontejneru kao Header, Footer i strane
 * Edukacije. PageHero je jedini bio širi (`max-w-[1536px]`, bez `lg:px-14`),
 * pa je panel vizuelno iskakao iz strane koja se pod njim poravnava.
 */
const HOUSE_CONTAINER = "max-w-[1240px]";
const HOUSE_PADDING = ["px-5", "md:px-8", "lg:px-14"];

const SOURCE = readFileSync(
  path.join(
    process.cwd(),
    "src/components/themes/theme-9/pages/Theme9ContentPage.tsx",
  ),
  "utf8",
);

/** Klase svakog `mx-auto` omotača — po jedan po sekciji strane. */
function containerClassLists(source: string): string[] {
  return (source.match(/className="([^"]*\bmx-auto\b[^"]*)"/g) ?? []).map(
    (match) => match.slice('className="'.length, -1),
  );
}

describe("Theme9ContentPage kontejner", () => {
  const containers = containerClassLists(SOURCE);

  it("svaka sekcija ima svoj omotač", () => {
    // PageHero, kartice, koraci, FAQ i završni CTA.
    expect(containers).toHaveLength(5);
  });

  it("svi omotači koriste isti kontejner kao ostale strane", () => {
    for (const classes of containers) {
      expect(classes).toContain(HOUSE_CONTAINER);
    }
    expect(SOURCE).not.toMatch(/max-w-\[(?!1240px)\d+px\][^"]*mx-auto|mx-auto[^"]*max-w-\[(?!1240px)\d+px\]/);
  });

  it("svi omotači imaju isto horizontalno poravnanje na svakoj širini", () => {
    for (const classes of containers) {
      for (const padding of HOUSE_PADDING) {
        expect({ classes, padding, ok: classes.includes(padding) }).toEqual({
          classes,
          padding,
          ok: true,
        });
      }
    }
  });
});
