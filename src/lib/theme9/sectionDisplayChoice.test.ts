import {
  SECTION_DISPLAY_CHOICES,
  choiceFromEnabled,
  choiceHint,
  editorVisibleFor,
  enabledFromChoice,
  type SectionDisplayChoice,
} from "./sectionDisplayChoice";
import { resolveTheme9Section } from "./presentationResolver";
import { mergeLandingStructureUpdate } from "@/lib/salon-profile/content-preservation";
import type { LandingStructure } from "@/types";

/** Sekcija kakvu je vlasnica stvarno napisala — sa sadržajem, bez odluke. */
const AUTHORED = {
  eyebrow: "Za koga je",
  headline: "Dve putanje, jedan pristup",
  lead: "Izaberite put koji vam odgovara.",
  paths: [
    {
      id: "p-1",
      chip: "Individualno",
      title: "Za vas",
      lead: "Procena stanja i plan nege.",
      bullets: ["Razgovor i procena", "Personalizovan plan"],
      tone: "surface",
    },
  ],
} as const;

function ls(section: Record<string, unknown>): LandingStructure {
  return { landing: { audiencePaths: section } } as unknown as LandingStructure;
}

/** Jedan krug: panel pošalje izbor, server spoji, vrati se novo stanje. */
function save(
  current: Record<string, unknown>,
  choice: SectionDisplayChoice,
): Record<string, unknown> {
  const outgoing = { ...current, enabled: enabledFromChoice(choice) };
  const merged = mergeLandingStructureUpdate(ls(current), ls(outgoing));
  return (merged.landing as Record<string, unknown>).audiencePaths as Record<
    string,
    unknown
  >;
}

describe("stanje iz baze → izbor u panelu", () => {
  it("`undefined` → Podrazumevano", () => {
    expect(choiceFromEnabled(undefined)).toBe("default");
  });

  it("`true` → Uključeno", () => {
    expect(choiceFromEnabled(true)).toBe("on");
  });

  it("`false` → Isključeno", () => {
    expect(choiceFromEnabled(false)).toBe("off");
  });

  it("`null` (upravo obrisano) čita se isto kao odsustvo", () => {
    expect(choiceFromEnabled(null)).toBe("default");
  });
});

describe("izbor u panelu → vrednost koja ide serveru", () => {
  it("Podrazumevano šalje `null` — signal za uklanjanje, ne vrednost", () => {
    expect(enabledFromChoice("default")).toBeNull();
  });

  it("Uključeno šalje `true`", () => {
    expect(enabledFromChoice("on")).toBe(true);
  });

  it("Isključeno šalje `false`", () => {
    expect(enabledFromChoice("off")).toBe(false);
  });

  it("prevod je obostrano dosledan", () => {
    for (const option of SECTION_DISPLAY_CHOICES) {
      expect(choiceFromEnabled(enabledFromChoice(option.value))).toBe(
        option.value,
      );
    }
  });
});

describe("editor je vidljiv i bez odluke", () => {
  it("Podrazumevano prikazuje polja — sadržaj je ono što odlučuje prikaz", () => {
    expect(editorVisibleFor("default")).toBe(true);
  });

  it("Uključeno prikazuje polja", () => {
    expect(editorVisibleFor("on")).toBe(true);
  });

  it("Isključeno sakriva polja, ali sadržaj ostaje u bazi", () => {
    expect(editorVisibleFor("off")).toBe(false);
  });

  it("svaki izbor ima objašnjenje", () => {
    for (const option of SECTION_DISPLAY_CHOICES) {
      expect(choiceHint(option.value).trim().length).toBeGreaterThan(0);
    }
  });
});

describe("šta se stvarno upiše", () => {
  it("Podrazumevano UKLANJA `enabled`, ne upisuje `false`", () => {
    const saved = save({ ...AUTHORED, enabled: true }, "default");
    expect("enabled" in saved).toBe(false);
    expect(saved.enabled).toBeUndefined();
  });

  it("Podrazumevano ne ostavlja `null` u bazi", () => {
    const saved = save({ ...AUTHORED, enabled: false }, "default");
    expect(saved.enabled).not.toBeNull();
    expect("enabled" in saved).toBe(false);
  });

  it("Isključeno upisuje `false`, sadržaj netaknut", () => {
    const saved = save({ ...AUTHORED }, "off");
    expect(saved.enabled).toBe(false);
    expect({ ...saved, enabled: undefined }).toEqual({
      ...AUTHORED,
      enabled: undefined,
    });
  });

  it("Uključeno upisuje `true`, sadržaj netaknut", () => {
    const saved = save({ ...AUTHORED }, "on");
    expect(saved.enabled).toBe(true);
    expect({ ...saved, enabled: undefined }).toEqual({
      ...AUTHORED,
      enabled: undefined,
    });
  });
});

/**
 * Ugovor koji 2B.4 postoji da zaključa: tri-state upravlja PRIKAZOM, ne
 * sadržajem. Ovo je scenario nad Marininim stvarnim oblikom sekcije.
 */
describe("Marinin scenario — prikaz se menja, sadržaj nikad", () => {
  it("ceo krug: bez odluke → isključeno → nazad na podrazumevano", () => {
    // ── 1. zatečeno: sadržaj postoji, odluka nije doneta ───────────────────
    let section: Record<string, unknown> = { ...AUTHORED };

    expect(choiceFromEnabled(section.enabled as undefined)).toBe("default");
    expect(resolveTheme9Section("audiencePaths", section)).toBe("authored");

    // ── 2. vlasnica bira Isključeno ────────────────────────────────────────
    section = save(section, "off");

    expect(choiceFromEnabled(section.enabled as boolean)).toBe("off");
    expect(resolveTheme9Section("audiencePaths", section)).toBe("hidden");
    // sadržaj identičan
    expect({ ...section, enabled: undefined }).toEqual({
      ...AUTHORED,
      enabled: undefined,
    });

    // ── 3. vraća na Podrazumevano ──────────────────────────────────────────
    section = save(section, "default");

    expect(choiceFromEnabled(section.enabled as undefined)).toBe("default");
    expect(resolveTheme9Section("audiencePaths", section)).toBe("authored");
    // i dalje isti sadržaj, i `enabled` je nestao
    expect(section).toEqual(AUTHORED);
  });

  it("round-trip undefined → true → false → undefined vraća identičan objekat", () => {
    const start: Record<string, unknown> = { ...AUTHORED };

    let section = save(start, "on");
    section = save(section, "off");
    section = save(section, "default");

    // ceo objekat, ne samo pojedina polja
    expect(section).toEqual(start);
    expect("enabled" in section).toBe(false);
  });

  it("nijedan prelaz ne gubi liste ni ugnežđene objekte", () => {
    let section: Record<string, unknown> = { ...AUTHORED };

    for (const choice of [
      "on",
      "off",
      "default",
      "off",
      "on",
      "default",
    ] as SectionDisplayChoice[]) {
      section = save(section, choice);
      expect(section.paths).toEqual(AUTHORED.paths);
      expect(section.headline).toBe(AUTHORED.headline);
    }
  });

  it("isključena sekcija bez sadržaja se ne pretvara u obrisanu", () => {
    const empty = { enabled: false };
    const saved = save(empty, "default");
    expect(saved).toEqual({});
  });
});

describe("legacy sekcije nisu pogođene", () => {
  it("`enabled: null` na bilo kojoj sekciji uklanja odluku, ne upisuje null", () => {
    // Pravilo je opšte na nivou lossless merge-a; UI ga nudi samo za theme-9.
    const merged = mergeLandingStructureUpdate(
      { landing: { blog: { enabled: true, headline: "Novosti" } } } as unknown as LandingStructure,
      { landing: { blog: { enabled: null, headline: "Novosti" } } } as unknown as LandingStructure,
    );
    const blog = (merged.landing as Record<string, unknown>).blog as Record<
      string,
      unknown
    >;
    expect("enabled" in blog).toBe(false);
    expect(blog.headline).toBe("Novosti");
  });

  it("izostavljen `enabled` i dalje znači „ništa ne menjaj”", () => {
    const merged = mergeLandingStructureUpdate(
      { landing: { blog: { enabled: true, headline: "Staro" } } } as unknown as LandingStructure,
      { landing: { blog: { headline: "Novo" } } } as unknown as LandingStructure,
    );
    const blog = (merged.landing as Record<string, unknown>).blog as Record<
      string,
      unknown
    >;
    expect(blog.enabled).toBe(true);
    expect(blog.headline).toBe("Novo");
  });
});
