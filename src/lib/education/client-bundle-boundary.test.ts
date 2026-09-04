import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Mongoose model u klijentskom bundle-u ruši stranicu u pregledaču
 * (`mongoose.models` tamo ne postoji), a nijedan serverski test to ne vidi:
 * `next build` prođe, testovi prođu, i sve pukne tek kad čovek otvori stranu.
 *
 * Zato se granica proverava TRANSITIVNO: od svake „use client" datoteke pratimo
 * lokalne uvoze i tvrdimo da se ni jednim putem ne stiže do `src/models/`.
 */
const SRC = path.join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

/**
 * `"use client"` sme da stoji posle uvodnog komentara, pa se traži u delu
 * datoteke PRE prvog `import`-a. Provera samo prvog znaka propušta svaku
 * klijentsku komponentu koja počinje docblock-om.
 */
function isClientModule(source: string): boolean {
  const head = source.slice(0, source.search(/^import\s/m) + 1 || 2000);
  return /["']use client["']/.test(head);
}

function resolveImport(fromFile: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? path.join(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(fromFile), specifier)
      : null;
  if (!base) return null;

  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Samo RUNTIME uvozi. `import type` / `export type` nestaju pri kompajliranju i
 * ne dovlače ništa u bundle — brojati ih davalo bi lažne prijave.
 */
function localImports(file: string): string[] {
  const source = readFileSync(file, "utf8").replace(
    /\b(?:im|ex)port\s+type\s[^;]*?from\s+["'][^"']+["']/g,
    "",
  );
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => resolveImport(file, match[1]))
    .filter((resolved): resolved is string => resolved !== null);
}

/**
 * ZATEČENI DUG, ne dozvola. Ove ivice postoje pre Education luka i vode iz
 * klijentskih komponenti u Mongoose modele preko serverskih helpera. Nisu
 * dirane jer pripadaju email/newsletter/theme granicama koje ovaj rez ne sme da
 * menja — ali su ovde nabrojane da budu vidljive i da se lista ne uvećava.
 */
const KNOWN_LEGACY_EDGES = new Set([
  "lib/email/email.ts → models/SalonProfile.ts",
  "lib/email/email.ts → models/Tenant.ts",
  "lib/email/templates/appointmentTemplates.ts → models/Tenant.ts",
  "lib/email/tenantEmailSettings.ts → models/SalonProfile.ts",
  "lib/email/tenantEmailSettings.ts → models/Tenant.ts",
  "lib/email/wrapEmailLayout.ts → models/ProfilPlatforme.ts",
  "lib/email/wrapEmailLayout.ts → models/SalonProfile.ts",
  "lib/newsletterService.ts → models/AudienceContact.ts",
  "lib/newsletterService.ts → models/NewsletterCampaign.ts",
  "lib/newsletterService.ts → models/NewsletterLog.ts",
  "lib/newsletterService.ts → models/Tenant.ts",
  "lib/newsletterService.ts → models/TenantUser.ts",
  "lib/salonClientGender.ts → models/SalonProfile.ts",
]);

/** Ivice `modul → model` do kojih se stiže iz „use client" ulaza. */
function modelEdgesReachableFromClient(): Set<string> {
  const edges = new Set<string>();

  for (const entry of walk(SRC)) {
    if (!isClientModule(readFileSync(entry, "utf8"))) continue;

    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);

      for (const imported of localImports(file)) {
        if (imported.startsWith(path.join(SRC, "models"))) {
          edges.add(
            `${path.relative(SRC, file)} → ${path.relative(SRC, imported)}`,
          );
        } else {
          queue.push(imported);
        }
      }
    }
  }
  return edges;
}

describe("granica klijentskog bundle-a", () => {
  it("Education površina ne dovlači nijedan Mongoose model", () => {
    const educationOffenders = [...modelEdgesReachableFromClient()].filter(
      (edge) => edge.startsWith("lib/education/") || edge.includes("education"),
    );

    expect(educationOffenders).toEqual([]);
  });

  it("model je označen kao server-only", () => {
    const source = readFileSync(
      path.join(SRC, "models/EducationContent.ts"),
      "utf8",
    );

    // Ovo je stvarna brana: bundler prekida build ako klijentski modul ovo
    // uveze, umesto da stranica padne tek u pregledaču.
    expect(source).toContain('import "server-only"');
  });

  it("lista zatečenih prelaza u modele se ne uvećava", () => {
    const unexpected = [...modelEdgesReachableFromClient()].filter(
      (edge) => !KNOWN_LEGACY_EDGES.has(edge),
    );

    expect(unexpected).toEqual([]);
  });

  it("server-renderovana javna površina ne poziva funkcije iz klijentskih modula", () => {
    /**
     * Suprotan smer od gornje granice, i jednako nevidljiv: `next build` prođe,
     * testovi prođu, a strana pukne tek kad je čovek otvori — „Attempted to
     * call X() from the server but X is on the client".
     *
     * Gleda se površina koju RSC stvarno renderuje na serveru: blok rendereri i
     * javne tenant strane. Komponente su izuzete jer server SME da renderuje
     * klijentsku komponentu — problem je samo POZIV klijentske funkcije, pa se
     * proveravaju uvozi koji ne počinju velikim slovom.
     *
     * Šire pravilo bi lažno prijavljivalo hookove bez sopstvene direktive, koji
     * granicu legalno nasleđuju od pozivaoca.
     */
    const SERVER_RENDERED = [
      "components/content-composer/blocks",
      "components/tenant",
      "app/tenant",
    ];

    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const relative = path.relative(SRC, file);
      if (!SERVER_RENDERED.some((dir) => relative.startsWith(dir))) continue;

      const source = readFileSync(file, "utf8");
      if (isClientModule(source)) continue;

      for (const [, names, specifier] of source.matchAll(
        /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/g,
      )) {
        const resolved = resolveImport(file, specifier);
        if (!resolved || !isClientModule(readFileSync(resolved, "utf8"))) continue;

        names
          .split(",")
          .map((name) => name.trim().split(/\s+as\s+/).pop()!.trim())
          .filter((name) => name && !name.startsWith("type ") && /^[a-z]/.test(name))
          .forEach((value) =>
            offenders.push(
              `${relative} → ${value}() iz ${path.relative(SRC, resolved)}`,
            ),
          );
      }
    }

    expect(offenders).toEqual([]);
  });
});
