/**
 * Runtime polovina persistence ugovora iz `@/types/landingPersistence`.
 *
 * Compile-time polovina vezuje ugovor za TypeScript `Landing`; ovde se isti
 * ugovor vezuje za STVARNU Mongoose šemu, introspekcijom `schema.eachPath()` —
 * ne čitanjem izvornog koda. Parsiranje `.ts` fajla bi ovde bilo pogrešno
 * sredstvo: pri istraživanju ovog incidenta brojač zagrada nad izvorom je
 * odlutao za jedan nivo i prijavio `pages.servicesPage` kao `landing` ključ.
 * Introspekcija nema tu klasu greške — pita se sam objekat koji Mongo koristi.
 *
 * Provera ide u OBA smera:
 *   ugovor − šema = polja koja persistence tiho gubi   (klasa greške `stats`)
 *   šema − ugovor = polja koja niko nije deklarisao u tipu
 */
import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { SalonProfile } from "@/models/SalonProfile";
import { LANDING_PERSISTED_KEYS } from "@/types/landingPersistence";

const LANDING_PREFIX = "landingStructure.landing.";

/** Direktni ključevi `landing` objekta, onako kako ih Mongoose zaista vodi. */
function mongooseLandingKeys(): string[] {
  const keys = new Set<string>();
  SalonProfile.schema.eachPath((pathName) => {
    if (!pathName.startsWith(LANDING_PREFIX)) return;
    keys.add(pathName.slice(LANDING_PREFIX.length).split(".")[0]);
  });
  return [...keys].sort();
}

describe("landing persistence ugovor — TypeScript ⟷ Mongoose", () => {
  it("introspekcija nije prazna (test ne sme da prolazi zato što ništa ne vidi)", () => {
    const found = mongooseLandingKeys();
    expect(found.length).toBeGreaterThan(0);
    // `hero` je najstariji blok; ako njega nema, prefiks je pogrešan, a ne šema.
    expect(found).toContain("hero");
  });

  it("nijedno polje iz ugovora ne nedostaje u Mongoose šemi", () => {
    const inSchema = new Set(mongooseLandingKeys());
    const missing = LANDING_PERSISTED_KEYS.filter((key) => !inSchema.has(key));
    expect(missing, "polja koja se deklarišu u tipu ali se ne snimaju u bazu").toEqual([]);
  });

  it("Mongoose šema ne nosi landing polje koje ugovor ne poznaje", () => {
    const inContract = new Set<string>(LANDING_PERSISTED_KEYS);
    const unexpected = mongooseLandingKeys().filter((key) => !inContract.has(key));
    expect(unexpected, "polja u bazi koja nisu deklarisana u `Landing` tipu").toEqual([]);
  });
});

describe("landing.stats stvarno preživljava kastovanje", () => {
  /**
   * Ugovor iznad dokazuje da put POSTOJI. Ovo dokazuje da se vrednost ne
   * odbacuje: Mongoose je `strict` po podrazumevanoj vrednosti, pa je pre ove
   * popravke `stats` bio nepoznat put i tiho je nestajao još pri kreiranju
   * dokumenta — bez greške, bez upozorenja, pre nego što se stigne do baze.
   */
  it("upisane metrike ostaju na dokumentu", () => {
    const doc = new SalonProfile({
      tenantId: new Types.ObjectId(),
      name: "Test salon",
      email: "test@example.com",
      landingStructure: {
        landing: {
          stats: [
            { value: "12", label: "godina iskustva" },
            { value: "480", label: "zadovoljnih klijentkinja" },
          ],
        },
      },
    });

    const stats = doc.landingStructure?.landing?.stats ?? [];
    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({ value: "12", label: "godina iskustva" });
    expect(stats[1]).toMatchObject({ value: "480", label: "zadovoljnih klijentkinja" });
  });

  it("izostavljene metrike daju prazan niz, ne `undefined`", () => {
    const doc = new SalonProfile({
      tenantId: new Types.ObjectId(),
      name: "Test salon",
      email: "test@example.com",
    });
    expect(doc.landingStructure?.landing?.stats).toEqual([]);
  });
});
