import { describe, expect, it } from "vitest";
import { buildTenantGraph, socialUrl } from "./tenantGraph";
import { getPublicSiteContext } from "./public-site";
import type { SalonProfileData } from "@/types";

const context = (domain: string, host = domain) =>
  getPublicSiteContext({
    domainType: "client",
    tenantSlug: "the-lash-room",
    tenantCustomDomain: domain,
    publicHost: host,
  });

const CDN = "https://res.cloudinary.com/marysoll/image/upload/v1/tenant";

const fullProfile = (over: Partial<SalonProfileData> = {}) =>
  ({
    _id: "65f000000000000000000001",
    name: "Lash Room by Anja",
    email: "vlasnik@privatni-mejl.com",
    description: "Premium ekstenzije trepavica i Lash Lift.",
    phone: "+381601234567",
    street: "Karađorđeva 1",
    city: "Loznica",
    lat: 44.531,
    lng: 19.223,
    social: { instagram: "@lashroom_byanja", facebook: "", tiktok: "" },
    logo: `${CDN}/logo.svg`,
    notificationLogo: `${CDN}/notif.png`,
    newsletterEmail: "interni@newsletter.rs",
    contactEmail: "interni-kontakt@salon.rs",
    tenantSlug: "the-lash-room",
    ...over,
  }) as unknown as SalonProfileData;

const graphFor = (profile: SalonProfileData, path = "/") =>
  buildTenantGraph(profile, context("lashroom-byanja.com"), path);

const node = (graph: Record<string, unknown>, type: string) =>
  (graph["@graph"] as Array<Record<string, unknown>>).find(
    (n) => n["@type"] === type,
  )!;

describe("tenant graph — identitet entiteta", () => {
  it("koristi kanonski tenant origin za sve @id vrednosti", () => {
    const graph = graphFor(fullProfile());
    expect(node(graph, "BeautySalon")["@id"]).toBe(
      "https://lashroom-byanja.com/#business",
    );
    expect(node(graph, "WebSite")["@id"]).toBe(
      "https://lashroom-byanja.com/#website",
    );
    // WebPage @id se gradi iz KANONSKOG URL-a stranice, a kanonski home nema
    // završnu crtu — zato ovde nema "/" kao kod business/website @id-jeva.
    expect(node(graph, "WebPage")["@id"]).toBe(
      "https://lashroom-byanja.com#webpage",
    );
  });

  it("WebPage @id prati stranicu, WebSite i business ostaju na originu", () => {
    const graph = graphFor(fullProfile(), "/usluge");
    expect(node(graph, "WebPage")["@id"]).toBe(
      "https://lashroom-byanja.com/usluge#webpage",
    );
    expect(node(graph, "WebSite")["@id"]).toBe(
      "https://lashroom-byanja.com/#website",
    );
  });

  it("čvorovi su međusobno povezani preko @id referenci", () => {
    const graph = graphFor(fullProfile());
    expect(node(graph, "WebSite").publisher).toEqual({
      "@id": "https://lashroom-byanja.com/#business",
    });
    expect(node(graph, "WebPage").isPartOf).toEqual({
      "@id": "https://lashroom-byanja.com/#website",
    });
    expect(node(graph, "WebPage").about).toEqual({
      "@id": "https://lashroom-byanja.com/#business",
    });
  });

  it("tenant bez custom domena koristi marysoll.com poddomen kao identitet", () => {
    const marina = getPublicSiteContext({
      domainType: "client",
      tenantSlug: "marina-stanisavljevic-skincare-edukacija",
      tenantCustomDomain: "",
      publicHost: "marina-stanisavljevic-skincare-edukacija.marysoll.com",
    });
    const graph = buildTenantGraph(fullProfile(), marina, "/");
    expect(node(graph, "BeautySalon")["@id"]).toBe(
      "https://marina-stanisavljevic-skincare-edukacija.marysoll.com/#business",
    );
  });

  it("preview host zadržava produkcioni identitet entiteta", () => {
    const preview = getPublicSiteContext({
      domainType: "client",
      tenantSlug: "the-lash-room",
      tenantCustomDomain: "lashroom-byanja.com",
      publicHost: "marysoll-git-seo.vercel.app",
    });
    expect(preview.isPreview).toBe(true);
    const graph = buildTenantGraph(fullProfile(), preview, "/");
    expect(node(graph, "BeautySalon")["@id"]).toBe(
      "https://lashroom-byanja.com/#business",
    );
  });

  it("tenant A pa tenant B — identitet ne curi", () => {
    const a = buildTenantGraph(
      fullProfile({ name: "Anja" }),
      context("lashroom-byanja.com"),
      "/",
    );
    const b = buildTenantGraph(
      fullProfile({ name: "Kiki" }),
      context("kikikiss.beauty"),
      "/",
    );
    expect(JSON.stringify(b)).not.toContain("lashroom-byanja.com");
    expect(JSON.stringify(a)).not.toContain("kikikiss.beauty");
  });
});

describe("tenant graph — privatnost", () => {
  it("ne objavljuje interne mejlove i id-jeve iz baze", () => {
    const serialized = JSON.stringify(graphFor(fullProfile()));
    expect(serialized).not.toContain("vlasnik@privatni-mejl.com");
    expect(serialized).not.toContain("interni@newsletter.rs");
    expect(serialized).not.toContain("interni-kontakt@salon.rs");
    expect(serialized).not.toContain("65f000000000000000000001");
  });

  it("objavljuje telefon jer teme isti broj prikazuju kao tel: link", () => {
    expect(node(graphFor(fullProfile()), "BeautySalon").telephone).toBe(
      "+381601234567",
    );
  });

  it("izostavlja telefon kada ga salon nije uneo", () => {
    const business = node(graphFor(fullProfile({ phone: "" })), "BeautySalon");
    expect(business).not.toHaveProperty("telephone");
  });

  it("ne objavljuje radno vreme, odmore ni SEO interna polja", () => {
    const serialized = JSON.stringify(
      graphFor(
        fullProfile({
          workingHours: { Ponedeljak: "09-17" },
          vacations: [{ from: "2026-01-01", to: "2026-01-10" }],
          seo: { homeTitle: "interno" },
        } as unknown as Partial<SalonProfileData>),
      ),
    );
    expect(serialized).not.toContain("Ponedeljak");
    expect(serialized).not.toContain("2026-01-01");
    expect(serialized).not.toContain("interno");
  });
});

describe("tenant graph — samo postojeće činjenice", () => {
  it("izostavlja adresu kada nema ni ulice ni grada", () => {
    const business = node(
      graphFor(fullProfile({ street: "", city: "" })),
      "BeautySalon",
    );
    expect(business).not.toHaveProperty("address");
  });

  it("izostavlja geo kada koordinate nisu poznate", () => {
    const business = node(
      graphFor(fullProfile({ lat: null, lng: null })),
      "BeautySalon",
    );
    expect(business).not.toHaveProperty("geo");
  });

  it("izostavlja sameAs kada nema nijedne mreže", () => {
    const business = node(
      graphFor(
        fullProfile({
          social: { instagram: "", facebook: "", tiktok: "" },
        } as Partial<SalonProfileData>),
      ),
      "BeautySalon",
    );
    expect(business).not.toHaveProperty("sameAs");
  });

  it("SVG logo ne ulazi u graf kao slika salona", () => {
    const business = node(
      graphFor(fullProfile({ logo: `${CDN}/logo.svg`, notificationLogo: null })),
      "BeautySalon",
    );
    expect(business).not.toHaveProperty("image");
  });

  it("koristi raster notificationLogo kao sliku salona", () => {
    expect(node(graphFor(fullProfile()), "BeautySalon").image).toBe(
      `${CDN}/notif.png`,
    );
  });

  it("favicon se NE objavljuje kao fotografija salona", () => {
    const business = node(
      graphFor(fullProfile({ logo: null, notificationLogo: null })),
      "BeautySalon",
    );
    expect(business).not.toHaveProperty("image");
    expect(JSON.stringify(business)).not.toContain("favicon");
  });
});

describe("sameAs — povezivanje javnih profila", () => {
  it("gradi Instagram URL iz handle-a sa i bez @", () => {
    expect(socialUrl("@anja", "instagram")).toBe(
      "https://www.instagram.com/anja/",
    );
    expect(socialUrl("anja", "instagram")).toBe(
      "https://www.instagram.com/anja/",
    );
  });

  it("gradi TikTok URL iz handle-a", () => {
    expect(socialUrl("@anja", "tiktok")).toBe("https://www.tiktok.com/@anja");
  });

  it("gradi Facebook URL iz handle-a", () => {
    expect(socialUrl("anja", "facebook")).toBe("https://www.facebook.com/anja");
  });

  it("prosleđuje pun URL netaknut", () => {
    expect(socialUrl("https://www.instagram.com/anja/", "instagram")).toBe(
      "https://www.instagram.com/anja/",
    );
  });

  it("prazna vrednost ne pravi lažan profil", () => {
    expect(socialUrl("", "instagram")).toBeNull();
    expect(socialUrl(undefined, "tiktok")).toBeNull();
  });
});

describe("tenant graph — opis entiteta", () => {
  it("koristi pun opis salona kada postoji", () => {
    expect(node(graphFor(fullProfile()), "BeautySalon").description).toBe(
      "Premium ekstenzije trepavica i Lash Lift.",
    );
  });

  // REGRESIJA: graf je gledao samo `description`, pa je tenant sa popunjenom
  // kratkom brend linijom ostajao potpuno bez opisa entiteta.
  it("pada na shortDescription kada nema punog opisa", () => {
    const graph = graphFor(
      fullProfile({
        description: "",
        shortDescription: "Skincare edukacija",
      } as Partial<SalonProfileData>),
    );
    expect(node(graph, "BeautySalon").description).toBe("Skincare edukacija");
  });

  it("izostavlja description kada nema nijednog javnog teksta", () => {
    const graph = graphFor(
      fullProfile({
        description: "",
        shortDescription: "",
      } as Partial<SalonProfileData>),
    );
    expect(node(graph, "BeautySalon")).not.toHaveProperty("description");
  });

  it("NIKAD ne koristi generisanu SEO rečenicu kao opis entiteta", () => {
    const graph = graphFor(
      fullProfile({
        description: "",
        shortDescription: "",
      } as Partial<SalonProfileData>),
    );
    expect(JSON.stringify(graph)).not.toContain("Pogledajte usluge");
  });
});
