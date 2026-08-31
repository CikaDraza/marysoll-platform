import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

/**
 * Granica koju ovaj rez postavlja:
 *
 *   /edukacija/{slug}                    JAVNO OTKRIVANJE, nikad zaštićeno telo
 *   /panel/moj-prostor/sadrzaji/{id}     PERSONALIZOVAN PRISTUP, jedini sa telom
 *
 * Da javna ruta postane personalizovana, ceo lanac keširanja, CDN-a, metapodataka
 * i sitemap-a bi morao da zna za korisnika — a ništa se ne bi dobilo.
 */
describe("javna ruta nikada ne služi zaštićeno telo", () => {
  it("javna Education strana ne zna za dodele ni za prijavljenog korisnika", () => {
    for (const file of [
      "src/app/tenant/edukacija/page.tsx",
      "src/app/tenant/edukacija/[...slug]/page.tsx",
      "src/lib/education/publicContent.ts",
    ]) {
      const source = read(file);

      expect(source).not.toContain("ClientContentAssignment");
      expect(source).not.toContain("entitlement");
      expect(source).not.toContain("readAssignedEducationContent");
    }
  });

  it("privatan sadržaj se ne pojavljuje u javnom upitu", () => {
    const loader = read("src/lib/education/publicContent.ts");

    // Javno je samo `public` i `gated`; `private` ne postoji za javnu stranu.
    expect(loader).toContain('$in: ["public", "gated"]');
    expect(loader).not.toContain('"private"');
  });

  it("zaštićeno čitanje traži sva četiri uslova, ne samo prijavljenost", () => {
    const entitlement = read("src/lib/education/entitlement.ts");

    expect(entitlement).toContain("tenantId");
    expect(entitlement).toContain("clientProfileId");
    expect(entitlement).toContain("educationContentId");
    expect(entitlement).toContain('status: "active"');
  });

  it("zaštićena strana je server-side i van indeksa", () => {
    const reader = read(
      "src/app/tenant/panel/moj-prostor/sadrzaji/[id]/page.tsx",
    );

    expect(reader).toContain("robots: { index: false, follow: false }");
    expect(reader).toContain("readAssignedEducationContent");
    expect(reader).not.toContain('"use client"');
  });

  it("klijentska lista ne dobija telo sadržaja", () => {
    const api = read("src/app/api/education/my-content/route.ts");

    expect(api).toContain("listAssignedEducationContent");
    expect(api).not.toContain("readAssignedEducationContent");
  });

  it("pristup se ne čuva u samom sadržaju nego kao zaseban odnos", () => {
    const model = read("src/models/EducationContent.ts");

    // `allowedClientIds` u dokumentu bi se raspao čim jedna klijentkinja dobije
    // više sadržaja, i onemogućio lifecycle polja dodele.
    expect(model).not.toContain("allowedClientIds");
    expect(model).not.toContain("clientProfileId");
  });
});
