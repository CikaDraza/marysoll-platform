import { describe, expect, it } from "vitest";
import {
  normalizeCopy,
  truncateOnWordBoundary,
  buildFactualDescription,
  resolveTenantDescription,
  resolveTenantTitle,
  buildTenantMetadataFacts,
  DESCRIPTION_MAX,
} from "./metadataFallback";

// Stvaran ručno unesen sadržaj — mora proći kroz sistem netaknut.
const ANJA_TITLE =
  "Lash Room by Anja | Trepavice u Loznici i Online Zakazivanje";
const ANJA_DESCRIPTION =
  "Lash Room by Anja u Loznici. Premium ekstenzije trepavica, Lash Lift i profesionalni lash tretmani. Rezervišite svoj termin jednostavno putem online zakazivanja";

describe("ručni SEO je autoritet", () => {
  const facts = { name: "Lash Room by Anja", city: "Loznica" };

  it("ručni naslov pobeđuje fallback", () => {
    expect(resolveTenantTitle(ANJA_TITLE, facts)).toBe(ANJA_TITLE);
  });

  it("ručni opis pobeđuje fallback", () => {
    expect(resolveTenantDescription(ANJA_DESCRIPTION, facts)).toBe(
      ANJA_DESCRIPTION,
    );
  });

  it("ručni opis se NE skraćuje ni kad prelazi limit", () => {
    expect(ANJA_DESCRIPTION.length).toBeGreaterThanOrEqual(DESCRIPTION_MAX);
    const result = resolveTenantDescription(ANJA_DESCRIPTION, facts);
    expect(result).toBe(ANJA_DESCRIPTION);
    expect(result).toMatch(/zakazivanja$/);
    expect(result).not.toContain("…");
  });

  it("ručni naslov pobeđuje i kada stranica ima suffix", () => {
    expect(
      resolveTenantTitle("Moj naslov", facts, { suffix: "Usluge" }),
    ).toBe("Moj naslov");
  });

  it("prazan/whitespace ručni unos se tretira kao da ga nema", () => {
    expect(resolveTenantDescription("   ", facts)).toBe(
      "Lash Room by Anja — Loznica. Pogledajte usluge i informacije o salonu.",
    );
  });
});

describe("fallback iz CMS/profil sadržaja", () => {
  it("koristi opis salona kada ručni SEO opis ne postoji", () => {
    const result = resolveTenantDescription(undefined, {
      name: "Studio X",
      description: "Salon lepote sa dugom tradicijom u centru grada.",
      city: "Novi Sad",
    });
    expect(result).toBe("Salon lepote sa dugom tradicijom u centru grada.");
  });

  it("pada na shortDescription kada nema punog opisa", () => {
    const result = resolveTenantDescription(undefined, {
      name: "Marina",
      shortDescription: "Skincare edukacija",
    });
    expect(result).toBe("Skincare edukacija");
  });

  it("pada na hero copy kada nema nijednog opisa", () => {
    const result = resolveTenantDescription(undefined, {
      name: "Studio X",
      heroCopy: [null, "Tretmani lica i tela za svaki tip kože"],
    });
    expect(result).toBe("Tretmani lica i tela za svaki tip kože");
  });

  it("poštuje redosled: opis pre shortDescription pre hero copy", () => {
    const result = resolveTenantDescription(undefined, {
      name: "Studio X",
      description: "Pun opis",
      shortDescription: "Kratak opis",
      heroCopy: ["Hero"],
    });
    expect(result).toBe("Pun opis");
  });

  it("skida markup iz starijih CMS zapisa", () => {
    const result = resolveTenantDescription(undefined, {
      name: "Studio X",
      description: "<p>Salon <strong>lepote</strong></p>",
    });
    expect(result).toBe("Salon lepote");
  });
});

describe("deterministički činjenični fallback", () => {
  it("naziv + grad + zakazivanje", () => {
    expect(
      buildFactualDescription({
        name: "Studio X",
        city: "Novi Sad",
        bookingEnabled: true,
      }),
    ).toBe("Studio X — Novi Sad. Pogledajte usluge i zakažite termin online.");
  });

  it("bez grada NE izmišlja grad", () => {
    const result = buildFactualDescription({
      name: "Studio X",
      bookingEnabled: true,
    });
    expect(result).toBe("Studio X. Pogledajte usluge i zakažite termin online.");
    expect(result).not.toContain("—");
  });

  it("kada je zakazivanje isključeno NE tvrdi da postoji online zakazivanje", () => {
    const result = buildFactualDescription({
      name: "Studio X",
      city: "Loznica",
      bookingEnabled: false,
    });
    expect(result).toBe(
      "Studio X — Loznica. Pogledajte usluge i informacije o salonu.",
    );
    expect(result).not.toContain("online");
  });

  it("bez naziva vraća prazno umesto izmišljene rečenice", () => {
    expect(buildFactualDescription({})).toBe("");
    expect(buildFactualDescription({ city: "Loznica" })).toBe("");
  });

  it("ne pominje kategoriju koje nema u podacima", () => {
    const result = buildFactualDescription({ name: "Studio X" });
    expect(result).not.toMatch(/salon lepote|beauty|kozmetičk/i);
  });

  it("koristi se tek kada nema nijednog CMS teksta", () => {
    expect(
      resolveTenantDescription(undefined, {
        name: "Studio X",
        city: "Loznica",
        bookingEnabled: true,
      }),
    ).toBe("Studio X — Loznica. Pogledajte usluge i zakažite termin online.");
  });

  // REGRESIJA: `bookingEnabled` je nekad bio `!== false`, pa je svaki tenant
  // kome niko ništa nije prosledio dobijao tvrdnju o online zakazivanju.
  it("bez eksplicitne potvrde NE tvrdi da postoji online zakazivanje", () => {
    const result = buildFactualDescription({
      name: "Studio X",
      city: "Loznica",
    });
    expect(result).toBe(
      "Studio X — Loznica. Pogledajte usluge i informacije o salonu.",
    );
    expect(result).not.toContain("zakažite");
  });

  it("undefined bookingEnabled se ponaša isto kao false", () => {
    expect(
      buildFactualDescription({ name: "Studio X", bookingEnabled: undefined }),
    ).toBe(buildFactualDescription({ name: "Studio X", bookingEnabled: false }));
  });
});

describe("skraćivanje", () => {
  it("nikad ne seče usred reči", () => {
    const long = "Premium ekstenzije trepavica ".repeat(20);
    const result = truncateOnWordBoundary(long);
    const withoutEllipsis = result.replace(/…$/, "");
    // Poslednji token mora biti cela reč iz originala
    const lastWord = withoutEllipsis.trim().split(" ").pop()!;
    expect(["Premium", "ekstenzije", "trepavica"]).toContain(lastWord);
  });

  it("ne dira tekst koji staje u limit", () => {
    expect(truncateOnWordBoundary("Kratak opis")).toBe("Kratak opis");
  });

  it("ne dodaje elipsu kada nije seklo", () => {
    expect(truncateOnWordBoundary("Kratak opis")).not.toContain("…");
  });

  it("preseca na kraju rečenice kada je to praktično", () => {
    const text =
      "Prva rečenica koja opisuje salon i sve njegove usluge veoma detaljno, precizno i jasno. " +
      "Druga rečenica koja bi prešla limit i zato nikako ne sme cela da uđe u opis metapodataka.";
    const result = truncateOnWordBoundary(text);
    expect(result).toBe(
      "Prva rečenica koja opisuje salon i sve njegove usluge veoma detaljno, precizno i jasno.",
    );
    expect(result).not.toContain("…");
  });

  it("kada bi cela rečenica potrošila premalo limita, seče na reči", () => {
    // Prva rečenica je kratka (ispod pola limita) — odsecanje na njoj bi
    // bacilo previše korisnog teksta, pa se ide do granice reči.
    const text =
      "Kratko. " +
      "Zatim mnogo duži nastavak teksta koji nosi stvarne informacije o salonu, o svim uslugama koje nudi i o načinu zakazivanja termina preko interneta u bilo koje doba dana.";
    const result = truncateOnWordBoundary(text);
    expect(result).not.toBe("Kratko.");
    expect(result).toContain("…");
  });

  it("sabija višak razmaka i prelome redova", () => {
    expect(normalizeCopy("  Salon \n\n  lepote  ")).toBe("Salon lepote");
  });

  it("rezultat ne prelazi limit (osim ručnog unosa)", () => {
    const long = "reč ".repeat(200);
    expect(truncateOnWordBoundary(long).length).toBeLessThanOrEqual(
      DESCRIPTION_MAX + 1,
    );
  });
});

describe("naslov — fallback", () => {
  it("naziv + grad kada nema ručnog naslova", () => {
    expect(resolveTenantTitle(undefined, { name: "Studio X", city: "Loznica" })).toBe(
      "Studio X — Loznica",
    );
  });

  it("samo naziv kada nema grada", () => {
    expect(resolveTenantTitle(undefined, { name: "Studio X" })).toBe("Studio X");
  });

  it("dodaje namenu stranice kao prefiks", () => {
    expect(
      resolveTenantTitle(undefined, { name: "Studio X" }, { suffix: "Usluge" }),
    ).toBe("Usluge — Studio X");
  });

  it("bez naziva pada na bezbedan minimum", () => {
    expect(resolveTenantTitle(undefined, {})).toBe("Salon");
  });
});

describe("tenant bez ručnog SEO-a i dalje dobija koristan opis", () => {
  it("Marina scenario — nema SEO polja, ima profil podatke", () => {
    const description = resolveTenantDescription(undefined, {
      name: "Marina Stanisavljević",
      shortDescription: "Skincare edukacija",
      city: "Beograd",
    });
    expect(description.length).toBeGreaterThan(0);
    expect(description).toBe("Skincare edukacija");
  });

  it("tenant bez ijednog teksta i dalje dobija činjeničnu rečenicu", () => {
    const description = resolveTenantDescription(undefined, {
      name: "Marina Stanisavljević",
      city: "Beograd",
    });
    expect(description.length).toBeGreaterThan(0);
    expect(description).toContain("Marina Stanisavljević");
    expect(description).toContain("Beograd");
  });

  it("opis nikada nije prazan string kada postoji naziv salona", () => {
    expect(resolveTenantDescription(undefined, { name: "X" })).not.toBe("");
  });
});

describe("gramatika činjeničnog fallback-a", () => {
  it("ne pravi pogrešan padež ni za jedan oblik naziva grada", () => {
    // Sve ovo bi prosto pravilo "u {grad}" pokvarilo.
    for (const city of ["Loznica", "Novi Sad", "Kragujevac", "Banja Luka", "Niš"]) {
      const result = buildFactualDescription({
        name: "Studio X",
        city,
        bookingEnabled: true,
      });
      expect(result).toBe(
        `Studio X — ${city}. Pogledajte usluge i zakažite termin online.`,
      );
      expect(result).not.toMatch(/\bu\s+[A-ZŠĐČĆŽ]/);
    }
  });
});

describe("buildTenantMetadataFacts — jedan izvor činjenica", () => {
  const profileWithHero = {
    name: "Studio X",
    description: "",
    shortDescription: "",
    city: "Loznica",
    landingStructure: {
      landing: {
        hero: {
          headline: "Studio X",
          subheadline: "Tretmani lica i tela za svaki tip kože",
          whereWhatForWhom: "Nega u Loznici",
        },
      },
    },
  } as unknown as Parameters<typeof buildTenantMetadataFacts>[0];

  it("uzima hero copy redosledom subheadline → whereWhatForWhom → headline", () => {
    expect(buildTenantMetadataFacts(profileWithHero).heroCopy).toEqual([
      "Tretmani lica i tela za svaki tip kože",
      "Nega u Loznici",
      "Studio X",
    ]);
  });

  it("hero copy stvarno završi u opisu kada nema ručnog SEO-a ni opisa", () => {
    expect(
      resolveTenantDescription(
        undefined,
        buildTenantMetadataFacts(profileWithHero),
      ),
    ).toBe("Tretmani lica i tela za svaki tip kože");
  });

  it("bez profila vraća prazne činjenice umesto pucanja", () => {
    expect(buildTenantMetadataFacts(null).name).toBeUndefined();
  });

  it("ne pretpostavlja zakazivanje — bookingEnabled ostaje neodređen", () => {
    expect(buildTenantMetadataFacts(profileWithHero).bookingEnabled).toBe(
      undefined,
    );
  });
});
