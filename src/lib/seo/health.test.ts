import { describe, expect, it } from "vitest";
import { evaluateSeoHealth, type SeoHealthCode } from "./health";
import type { SalonProfileData } from "@/types";

const CDN = "https://res.cloudinary.com/marysoll/image/upload/v1/tenant";

/** Tenant sa potpuno popunjenim SEO profilom — polazna tačka za varijacije. */
const healthy = (over: Partial<SalonProfileData> = {}) =>
  ({
    _id: "profile-1",
    name: "Lash Room by Anja",
    description: "Premium ekstenzije trepavica i Lash Lift u Loznici.",
    shortDescription: "Trepavice",
    city: "Loznica",
    street: "Karađorđeva 1",
    phone: "+381601234567",
    logo: `${CDN}/logo.svg`,
    notificationLogo: `${CDN}/notif.png`,
    social: { instagram: "@lashroom_byanja", facebook: "", tiktok: "" },
    seo: {
      homeTitle: "Lash Room by Anja | Trepavice u Loznici",
      homeDescription: "Premium ekstenzije trepavica.",
      uslugeTitle: "Usluge",
      uslugeDescription: "Cenovnik.",
      terminiTitle: "Termini",
      terminiDescription: "Zakazivanje.",
    },
    ...over,
  }) as unknown as SalonProfileData;

const codes = (profile: SalonProfileData | null): SeoHealthCode[] =>
  evaluateSeoHealth(profile).map((i) => i.code);

describe("SEO health — zdrav tenant", () => {
  it("potpuno popunjen profil nema nijedan savet", () => {
    expect(evaluateSeoHealth(healthy())).toEqual([]);
  });

  it("SVG logo sam po sebi nije problem kada postoji raster notificationLogo", () => {
    expect(codes(healthy())).not.toContain("seo.social.imageFallback");
  });
});

describe("SEO health — nedostajući ručni SEO", () => {
  it("prijavljuje nedostajuće naslove i navodi koje stranice", () => {
    const issues = evaluateSeoHealth(
      healthy({ seo: { homeDescription: "x", uslugeDescription: "x", terminiDescription: "x" } } as Partial<SalonProfileData>),
    );
    const titleIssue = issues.find((i) => i.code === "seo.title.missing")!;
    expect(titleIssue).toBeDefined();
    expect(titleIssue.message).toContain("početna");
    expect(titleIssue.message).toContain("usluge");
    expect(titleIssue.message).toContain("termini");
  });

  it("nedostajući ručni SEO je savet (info), ne greška", () => {
    const issues = evaluateSeoHealth(
      healthy({ seo: {} } as Partial<SalonProfileData>),
    );
    const manual = issues.filter(
      (i) => i.code === "seo.title.missing" || i.code === "seo.description.missing",
    );
    expect(manual).toHaveLength(2);
    for (const issue of manual) expect(issue.severity).toBe("info");
  });

  it("delimično popunjen SEO prijavljuje samo ono što fali", () => {
    const issues = evaluateSeoHealth(
      healthy({
        seo: {
          homeTitle: "Ima",
          homeDescription: "Ima",
          uslugeTitle: "Ima",
          uslugeDescription: "Ima",
          terminiTitle: "Ima",
        },
      } as Partial<SalonProfileData>),
    );
    const issue = issues.find((i) => i.code === "seo.description.missing")!;
    expect(issue.message).toContain("termini");
    expect(issue.message).not.toContain("početna");
  });
});

describe("SEO health — kvalitet automatskog opisa", () => {
  it("prijavljuje kada nema nikakvog javnog opisa", () => {
    expect(
      codes(healthy({ description: "", shortDescription: "" })),
    ).toContain("seo.profile.descriptionMissing");
  });

  it("prijavljuje kada opis početne pada na generisanu rečenicu", () => {
    const result = codes(
      healthy({
        description: "",
        shortDescription: "",
        seo: { uslugeTitle: "x" },
      } as Partial<SalonProfileData>),
    );
    expect(result).toContain("seo.description.generated");
  });

  // REGRESIJA: health je gradio svoj skup činjenica bez hero copy-ja, pa je
  // tenant čiji meta opis stvarno dolazi iz CMS hero teksta dobijao upozorenje
  // da mu se opis generiše.
  it("ne prijavljuje generisan opis kada hero copy popunjava meta opis", () => {
    const profile = healthy({
      description: "",
      shortDescription: "",
      seo: { uslugeTitle: "x" },
      landingStructure: {
        landing: {
          hero: { subheadline: "Tretmani lica i tela za svaki tip kože" },
        },
      },
    } as unknown as Partial<SalonProfileData>);
    expect(codes(profile)).not.toContain("seo.description.generated");
  });

  it("prijavljuje generisan opis kada je hero copy prazan", () => {
    const profile = healthy({
      description: "",
      shortDescription: "",
      seo: { uslugeTitle: "x" },
      landingStructure: {
        landing: { hero: { subheadline: "   ", headline: "" } },
      },
    } as unknown as Partial<SalonProfileData>);
    expect(codes(profile)).toContain("seo.description.generated");
  });

  it("ne prijavljuje generisan opis kada postoji ručni SEO opis", () => {
    expect(
      codes(healthy({ description: "", shortDescription: "" })),
    ).not.toContain("seo.description.generated");
  });

  it("prijavljuje nedostatak grada", () => {
    expect(codes(healthy({ city: "" }))).toContain("seo.profile.cityMissing");
  });
});

describe("SEO health — social", () => {
  it("prijavljuje pad na favicon kada nema nijedne raster slike", () => {
    expect(
      codes(healthy({ logo: `${CDN}/logo.svg`, notificationLogo: null })),
    ).toContain("seo.social.imageFallback");
  });

  it("ne prijavljuje pad na favicon kada je logo raster", () => {
    expect(
      codes(healthy({ logo: `${CDN}/logo.png`, notificationLogo: null })),
    ).not.toContain("seo.social.imageFallback");
  });

  it("prijavljuje nedostatak raster logo-a za notifikacije", () => {
    expect(codes(healthy({ notificationLogo: null }))).toContain(
      "seo.social.rasterLogoMissing",
    );
  });

  // REGRESIJA: provera je bila Boolean(notificationLogo), pa je SVG ili
  // malformed vrednost prolazila kao "ima raster logo" iako ga social selector
  // odbija.
  it("SVG notificationLogo se broji kao da raster logo-a nema", () => {
    expect(codes(healthy({ notificationLogo: `${CDN}/notif.svg` }))).toContain(
      "seo.social.rasterLogoMissing",
    );
  });

  it("vrednost bez ekstenzije se broji kao da raster logo-a nema", () => {
    expect(codes(healthy({ notificationLogo: "   " }))).toContain(
      "seo.social.rasterLogoMissing",
    );
  });

  it("stvaran raster notificationLogo ne prijavljuje ništa", () => {
    expect(codes(healthy({ notificationLogo: `${CDN}/notif.webp?v=2` }))).not.toContain(
      "seo.social.rasterLogoMissing",
    );
  });

  it("prijavljuje kada nema nijednog javnog profila na mrežama", () => {
    expect(
      codes(
        healthy({
          social: { instagram: "", facebook: "", tiktok: "" },
        } as Partial<SalonProfileData>),
      ),
    ).toContain("seo.social.profilesMissing");
  });

  it("jedan profil na mrežama je dovoljan", () => {
    expect(
      codes(
        healthy({
          social: { instagram: "", facebook: "", tiktok: "@anja" },
        } as Partial<SalonProfileData>),
      ),
    ).not.toContain("seo.social.profilesMissing");
  });
});

describe("SEO health — identitet i granice", () => {
  it("prijavljuje nedostatak naziva salona", () => {
    expect(codes(healthy({ name: "" }))).toContain("seo.identity.incomplete");
  });

  it("nedostupan profil daje jasan warning umesto tihe tišine", () => {
    const issues = evaluateSeoHealth(null);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("seo.identity.incomplete");
    expect(issues[0].severity).toBe("warning");
  });

  it("nijedan savet nije blokirajući — sve je warning ili info", () => {
    const issues = evaluateSeoHealth(
      healthy({
        name: "",
        description: "",
        shortDescription: "",
        city: "",
        notificationLogo: null,
        logo: null,
        social: { instagram: "", facebook: "", tiktok: "" },
        seo: {},
      } as Partial<SalonProfileData>),
    );
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(["warning", "info"]).toContain(issue.severity);
    }
  });

  it("svaki savet nosi konkretno uputstvo šta uraditi", () => {
    const issues = evaluateSeoHealth(
      healthy({ city: "", notificationLogo: null, seo: {} } as Partial<SalonProfileData>),
    );
    for (const issue of issues) {
      expect(issue.hint.length).toBeGreaterThan(0);
      expect(issue.message.length).toBeGreaterThan(0);
    }
  });

  it("procena ne menja profil koji joj je prosleđen", () => {
    const profile = healthy({ seo: {} } as Partial<SalonProfileData>);
    const snapshot = JSON.stringify(profile);
    evaluateSeoHealth(profile);
    expect(JSON.stringify(profile)).toBe(snapshot);
  });
});
