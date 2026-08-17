/**
 * T2A.3 inventar se proverava protiv STVARNOG koda tema.
 *
 * Poenta: inventar ne sme tiho da zastari. Ako neko doda ili ukloni CMS flag u
 * `ThemeNLanding.tsx`, ovaj test pada i tera da se inventar (a time i plan
 * migracije) ažurira u istom PR-u.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  THEME_COMPOSITIONS,
  cmsBlockTypes,
  compositionFor,
  unconditionalCmsBlocks,
  type LegacyCmsFlag,
} from "./theme-composition";

const LAYOUT_DIR = path.join(process.cwd(), "src/components/themes/layouts");

function layoutSourceOf(theme: string): string {
  const n = theme.replace("theme-", "");
  return readFileSync(path.join(LAYOUT_DIR, `Theme${n}Landing.tsx`), "utf8");
}

/** CMS flagovi koje fajl teme stvarno pominje. */
function flagsUsedBy(theme: string): Set<string> {
  return new Set(layoutSourceOf(theme).match(/[a-zA-Z]+Enabled/g) ?? []);
}

/**
 * Tipovi blokova redom pojavljivanja — i normalni `<ThemeBlock>` i compat
 * `<LegacyAlwaysThemeBlock>`, jer su za kompoziciju ravnopravni: oba su ista
 * sekcija na istom mestu, razlikuje ih samo način pronalaženja bloka.
 */
function themeBlockTypesUsedBy(theme: string): string[] {
  const re = /<(?:ThemeBlock|LegacyAlwaysThemeBlock)\s[^>]*?type="([^"]+)"/g;
  return [...layoutSourceOf(theme).matchAll(re)].map((m) => m[1]);
}

/** CMS sekcije koje migrirana tema renderuje kroz compat putanju. */
function legacyAlwaysSourcesUsedBy(theme: string): string[] {
  const re = /<LegacyAlwaysThemeBlock\s[^>]*?source="([^"]+)"/g;
  return [...layoutSourceOf(theme).matchAll(re)].map((m) => m[1]);
}

const ALL_FLAGS: LegacyCmsFlag[] = [
  "heroEnabled",
  "aboutEnabled",
  "artistsEnabled",
  "servicesPreviewEnabled",
  "appointmentEnabled",
  "testimonialsEnabled",
  "galleryEnabled",
  "faqEnabled",
  "blogEnabled",
  "perksEnabled",
];

describe("inventar pokriva svih 8 tema", () => {
  it("ima tačno 8 zapisa, bez duplikata", () => {
    expect(THEME_COMPOSITIONS).toHaveLength(8);
    const ids = THEME_COMPOSITIONS.map((c) => c.theme);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toEqual([
      "theme-1",
      "theme-2",
      "theme-3",
      "theme-4",
      "theme-5",
      "theme-6",
      "theme-7",
      "theme-8",
    ]);
  });
});

describe.each(THEME_COMPOSITIONS)("$theme", (composition) => {
  const legacy = composition.visibility === "legacy-flags";

  it.runIf(legacy)("honoredFlags se poklapaju sa flagovima u stvarnom fajlu teme", () => {
    const used = flagsUsedBy(composition.theme);
    expect([...composition.honoredFlags].sort()).toEqual([...used].sort());
  });

  it.runIf(legacy)("flagovi koje tema NE poštuje nisu u fajlu (nema mrtvog gate-a)", () => {
    const used = flagsUsedBy(composition.theme);
    const ignored = ALL_FLAGS.filter((f) => !composition.honoredFlags.includes(f));
    for (const flag of ignored) {
      expect(used.has(flag), `${composition.theme} ipak koristi ${flag}`).toBe(false);
    }
  });

  // ── Migrirana tema (visibility: "theme-document") ────────────────────────
  // Vidljivost više ne stiže kroz `*Enabled` propove nego kroz postojanje bloka
  // u dokumentu, pa se inventar proverava protiv `<ThemeBlock type="…">` poziva.
  // Ovo hvata baš ono što vizuelna regresija teško vidi: izostavljenu ili
  // premeštenu sekciju.
  it.runIf(!legacy)("ne koristi nijedan stari CMS flag", () => {
    expect([...flagsUsedBy(composition.theme)]).toEqual([]);
  });

  it.runIf(!legacy)("renderuje tačno CMS blokove iz inventara, istim redom", () => {
    expect(themeBlockTypesUsedBy(composition.theme)).toEqual(
      cmsBlockTypes(composition.theme),
    );
  });

  // Compat putanja je dozvoljena TAČNO za bezuslovne sekcije — ni manje (tiha
  // promena ponašanja) ni više (compat koji tema ne sme da koristi).
  it.runIf(!legacy)("compat blokove koristi tačno za bezuslovne sekcije", () => {
    expect([...legacyAlwaysSourcesUsedBy(composition.theme)].sort()).toEqual(
      [...unconditionalCmsBlocks(composition.theme)].sort(),
    );
  });

  it("svaki cms-block ima poznat blockType i neprazan uslov", () => {
    const KNOWN = new Set([
      "content.hero",
      "content.about",
      "content.team",
      "services.catalog",
      "booking.services",
      "content.testimonials",
      "content.gallery",
      "content.faq",
      "content.blog",
      "content.perks",
    ]);
    for (const node of composition.nodes) {
      if (node.kind !== "cms-block") continue;
      expect(KNOWN.has(node.blockType), `nepoznat blockType ${node.blockType}`).toBe(true);
      expect(node.conditional.length).toBeGreaterThan(0);
    }
  });

  it("nema dupliranih čvorova", () => {
    const keys = composition.nodes.map((n) =>
      n.kind === "cms-block" ? `cms:${n.source}` : `${n.kind}:${n.id}`,
    );
    expect(new Set(keys).size, `duplikat u ${composition.theme}`).toBe(keys.length);
  });

  it("uslovan cms-block imenuje flag koji tema stvarno poštuje", () => {
    for (const node of composition.nodes) {
      if (node.kind !== "cms-block") continue;
      if (node.conditional.startsWith("always")) continue;
      const named = ALL_FLAGS.filter((f) => node.conditional.includes(f));
      expect(named.length, `${node.source}: uslov ne imenuje flag`).toBeGreaterThan(0);
      for (const flag of named) {
        expect(composition.honoredFlags).toContain(flag);
      }
    }
  });
});

describe("nalazi koji menjaju plan migracije", () => {
  it("Theme2 renderuje hero/about/services bez obzira na CMS", () => {
    expect(unconditionalCmsBlocks("theme-2").sort()).toEqual([
      "about",
      "hero",
      "servicesPreview",
    ]);
  });

  it("Theme2 utisci VIŠE nisu bezuslovni (normalizacija, spec 6.4)", () => {
    expect(unconditionalCmsBlocks("theme-2")).not.toContain("testimonials");
    expect(compositionFor("theme-2")!.honoredFlags).toContain("testimonialsEnabled");
  });

  it("Theme5 je najmanje CMS-gated tema", () => {
    expect(unconditionalCmsBlocks("theme-5").sort()).toEqual([
      "about",
      "appointmentSection",
      "gallery",
      "hero",
      "servicesPreview",
    ]);
  });

  it("Theme7 renderuje booking uvek jer je u hero slotu", () => {
    expect(unconditionalCmsBlocks("theme-7")).toEqual(["appointmentSection"]);
    expect(compositionFor("theme-7")?.honoredFlags).not.toContain("appointmentEnabled");
  });

  it("Theme8 nema booking ni team blok, ali ima shell slojeve", () => {
    const c = compositionFor("theme-8")!;
    const cmsSources = c.nodes.filter((n) => n.kind === "cms-block").map((n) => n.source);
    expect(cmsSources).not.toContain("appointmentSection");
    expect(cmsSources).not.toContain("artists");
    expect(c.nodes.filter((n) => n.kind === "shell").length).toBeGreaterThanOrEqual(8);
  });

  it("theme-native čvorovi postoje u većini tema i ostaju vlasništvo teme", () => {
    const withNative = THEME_COMPOSITIONS.filter((c) =>
      c.nodes.some((n) => n.kind === "theme-native"),
    );
    expect(withNative.map((c) => c.theme)).toEqual([
      "theme-1",
      "theme-2",
      "theme-3",
      "theme-4",
      "theme-5",
      "theme-6",
      "theme-7",
      "theme-8",
    ]);
  });
});
