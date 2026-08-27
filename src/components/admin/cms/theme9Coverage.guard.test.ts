/**
 * Guard: svaki CMS blok koji theme-9 renderuje mora imati površinu za unos.
 *
 * Klasa greške koju zatvara: blok postoji u tipu, u Mongoose šemi i u temi, ali
 * ga vlasnica ne može urediti — pa sadržaj može da uđe samo seed skriptom.
 * Tačno to je bilo stanje sedam theme-9 sekcija pre 2A.2.
 *
 * Guard NE uvodi nov spisak sekcija ni polja. Oba izvora su postojeća i
 * merodavna:
 *   • koje sekcije   → `compositionFor("theme-9")`, isti izvor po kome se
 *                      stranica renderuje;
 *   • koja polja     → introspekcija Mongoose šeme, isti izvor koji odlučuje
 *                      šta se uopšte može sačuvati.
 *
 * Ime editor funkcije se IZVODI iz imena bloka (`audiencePaths` →
 * `AudiencePathsEditor`), pa ni mapiranje nije ručno održavan spisak.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SalonProfile } from "@/models/SalonProfile";
import { compositionFor } from "@/lib/platform/theme-composition";

const CMS_DIR = path.join(process.cwd(), "src/components/admin/cms");
const MAIN_EDITOR = path.join(CMS_DIR, "AdminLandingCMS.tsx");
const THEME9_EDITOR = path.join(CMS_DIR, "Theme9Sections.tsx");

/**
 * Polja koja se namerno ne izlažu korisniku:
 *   `_id`     — Mongo interni ključ;
 *   `id`      — React ključ, a kod `topicHub` i veza filtera i teme; generiše
 *               se automatski da bi ostao stabilan dok se natpis menja;
 *   `enabled` — nije polje forme nego prekidač na `SectionCard`.
 */
const INTERNAL_FIELDS = new Set(["_id", "id", "enabled"]);

function theme9CmsSources(): string[] {
  const composition = compositionFor("theme-9");
  if (!composition) throw new Error("theme-9 kompozicija ne postoji");
  return composition.nodes
    .filter((node) => node.kind === "cms-block")
    .map((node) => (node as { source: string }).source);
}

/** Listovi jednog landing bloka, onako kako ih Mongoose zaista vodi. */
function schemaFields(block: string): string[] {
  const prefix = `landingStructure.landing.${block}`;
  const fields = new Set<string>();
  SalonProfile.schema.eachPath((pathName, schemaType) => {
    if (pathName !== prefix && !pathName.startsWith(prefix + ".")) return;
    const relative = pathName.slice(prefix.length + 1);
    if (relative) fields.add(relative.split(".").pop() as string);
    const sub = (schemaType as unknown as { schema?: { paths: object } }).schema;
    if (sub) for (const key of Object.keys(sub.paths)) fields.add(key);
  });
  return [...fields].filter((f) => !INTERNAL_FIELDS.has(f)).sort();
}

/**
 * Traži polje kao PRISTUP SVOJSTVU (`.polje`) ili KLJUČ objekta (`polje:`), a
 * ne kao goli tekst. Golo pretraživanje bi bilo lažno zeleno: `text-gray-400` u
 * className-u sadrži `text`, pa bi polje `text` „prošlo" i kad ga niko ne uređuje.
 */
function editsField(source: string, field: string): boolean {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(\\.\\s*${escaped}\\b)|(\\b${escaped}\\s*:)`).test(source);
}

/** `audiencePaths` → `AudiencePathsEditor`; izvedeno, ne prepisano. */
function editorFunctionName(block: string): string {
  return block.charAt(0).toUpperCase() + block.slice(1) + "Editor";
}

function functionBody(source: string, fnName: string): string | null {
  const marker = `export function ${fnName}(`;
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const next = source.indexOf("\nexport function ", start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

describe("theme-9 CMS coverage", () => {
  it("detektor razlikuje uređivanje polja od golog pojavljivanja imena", () => {
    // Bez ovoga bi guard bio lažno zelen: `text-gray-400` sadrži `text`.
    expect(editsField('className="text-gray-400"', "text")).toBe(false);
    expect(editsField("patch({ text: v })", "text")).toBe(true);
    expect(editsField("value={block.cta?.text}", "text")).toBe(true);
    // `formats` ne sme da zadovolji polje `format`.
    expect(editsField("const formats = block.formats ?? [];", "format")).toBe(false);
    expect(editsField("value={details.format}", "format")).toBe(true);
  });

  it("oba fajla editora postoje", () => {
    expect(existsSync(MAIN_EDITOR)).toBe(true);
    expect(existsSync(THEME9_EDITOR)).toBe(true);
  });

  it("svaki CMS blok iz theme-9 kompozicije ima površinu za unos", () => {
    const main = readFileSync(MAIN_EDITOR, "utf8");
    const theme9 = readFileSync(THEME9_EDITOR, "utf8");
    const sources = theme9CmsSources();

    // Ako kompozicija ikad ostane bez CMS blokova, test bi „prošao" ne
    // proverivši ništa — zato prvo tvrdimo da ih ima.
    expect(sources.length).toBeGreaterThan(5);

    const uncovered = sources.filter(
      (source) =>
        !main.includes(`updateLandingSection("${source}"`) &&
        !theme9.includes(`update("${source}"`),
    );
    expect(uncovered, "blokovi koje theme-9 renderuje a niko ne može urediti").toEqual([]);
  });

  it("svako persistovano polje theme-9 sekcije ima svoj unos", () => {
    const theme9 = readFileSync(THEME9_EDITOR, "utf8");
    const main = readFileSync(MAIN_EDITOR, "utf8");
    const sources = theme9CmsSources();

    const missing: string[] = [];
    for (const block of sources) {
      const body = functionBody(theme9, editorFunctionName(block));
      // Blokove koje uređuje glavni editor (hero, about, blog) ovaj fajl ne
      // pokriva — njihova pokrivenost je zasebno pitanje i ne uvodi se ovde.
      if (!body) {
        expect(main).toContain(`updateLandingSection("${block}"`);
        continue;
      }
      const fields = schemaFields(block);
      expect(fields.length, `${block} nema nijedno polje u šemi`).toBeGreaterThan(0);
      for (const field of fields) {
        if (!editsField(body, field)) missing.push(`${block}.${field}`);
      }
    }
    expect(missing, "polja koja se snimaju ali se ne mogu uneti").toEqual([]);
  });
});
