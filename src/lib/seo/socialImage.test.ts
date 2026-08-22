import { describe, expect, it } from "vitest";
import { isRasterSocialImage, getTenantSocialImage } from "./socialImage";
import { getPublicSiteContext, tenantPageMetadata } from "./public-site";
import type { SalonProfileData } from "@/types";

const tenant = (slug: string, domain: string) =>
  getPublicSiteContext({
    domainType: "client",
    tenantSlug: slug,
    tenantCustomDomain: domain,
    publicHost: domain,
  });

const profile = (
  fields: Partial<SalonProfileData>,
): Pick<SalonProfileData, "logo" | "notificationLogo"> => ({
  logo: null,
  notificationLogo: null,
  ...fields,
});

const CDN = "https://res.cloudinary.com/marysoll/image/upload/v1/tenant";

describe("isRasterSocialImage", () => {
  it("prihvata PNG/JPG/JPEG/WEBP", () => {
    for (const ext of ["png", "jpg", "jpeg", "webp"]) {
      expect(isRasterSocialImage(`${CDN}/logo.${ext}`)).toBe(true);
    }
  });

  it("prihvata i velika slova u ekstenziji", () => {
    expect(isRasterSocialImage(`${CDN}/logo.PNG`)).toBe(true);
  });

  it("odbija SVG", () => {
    expect(isRasterSocialImage(`${CDN}/logo.svg`)).toBe(false);
  });

  it("odbija SVG sa query stringom i hash-om", () => {
    expect(isRasterSocialImage(`${CDN}/logo.svg?v=2`)).toBe(false);
    expect(isRasterSocialImage(`${CDN}/logo.svg#icon`)).toBe(false);
  });

  it("čita ekstenziju ispred query stringa", () => {
    expect(isRasterSocialImage(`${CDN}/logo.png?v=2`)).toBe(true);
  });

  it("odbija URL bez ekstenzije (fail closed)", () => {
    expect(isRasterSocialImage(`${CDN}/logo`)).toBe(false);
  });

  it("odbija prazno, null i ne-string vrednosti", () => {
    expect(isRasterSocialImage("")).toBe(false);
    expect(isRasterSocialImage("   ")).toBe(false);
    expect(isRasterSocialImage(null)).toBe(false);
    expect(isRasterSocialImage(undefined)).toBe(false);
    expect(isRasterSocialImage(42)).toBe(false);
  });
});

describe("getTenantSocialImage", () => {
  const context = tenant("the-lash-room", "lashroom-byanja.com");

  it("SVG logo + WEBP notificationLogo → koristi notificationLogo", () => {
    const image = getTenantSocialImage(
      profile({
        logo: `${CDN}/site-logo.svg`,
        notificationLogo: `${CDN}/notif.webp`,
      }),
      context,
    );
    expect(image).toBe(`${CDN}/notif.webp`);
  });

  it("notificationLogo ima prednost i kad je logo raster", () => {
    const image = getTenantSocialImage(
      profile({
        logo: `${CDN}/site-logo.png`,
        notificationLogo: `${CDN}/notif.png`,
      }),
      context,
    );
    expect(image).toBe(`${CDN}/notif.png`);
  });

  it("bez notificationLogo-a koristi raster logo", () => {
    const image = getTenantSocialImage(
      profile({ logo: `${CDN}/site-logo.jpg` }),
      context,
    );
    expect(image).toBe(`${CDN}/site-logo.jpg`);
  });

  it("SVG logo bez raster notificationLogo-a → tenant favicon", () => {
    const image = getTenantSocialImage(
      profile({ logo: `${CDN}/site-logo.svg` }),
      context,
    );
    expect(image).toBe("https://lashroom-byanja.com/favicon.ico");
  });

  it("bez ijedne slike → tenant favicon", () => {
    expect(getTenantSocialImage(profile({}), context)).toBe(
      "https://lashroom-byanja.com/favicon.ico",
    );
  });

  it("null profil → tenant favicon", () => {
    expect(getTenantSocialImage(null, context)).toBe(
      "https://lashroom-byanja.com/favicon.ico",
    );
  });

  it("SVG nikada ne postaje social slika ni u jednoj kombinaciji", () => {
    const combos = [
      { logo: `${CDN}/a.svg`, notificationLogo: `${CDN}/b.svg` },
      { logo: `${CDN}/a.svg`, notificationLogo: null },
      { logo: null, notificationLogo: `${CDN}/b.svg` },
    ];
    for (const combo of combos) {
      expect(getTenantSocialImage(profile(combo), context)).not.toMatch(/\.svg/);
    }
  });

  it("favicon je uvek na tenant originu, ne na marysoll.com", () => {
    const marina = getPublicSiteContext({
      domainType: "client",
      tenantSlug: "marina-stanisavljevic-skincare-edukacija",
      tenantCustomDomain: "",
      publicHost: "marina-stanisavljevic-skincare-edukacija.marysoll.com",
    });
    expect(getTenantSocialImage(profile({}), marina)).toBe(
      "https://marina-stanisavljevic-skincare-edukacija.marysoll.com/favicon.ico",
    );
  });
});

describe("social metadata — izolacija i curenje platforme", () => {
  it("Marysoll marketinška slika ne može da uđe u tenant metadata", () => {
    const context = tenant("the-lash-room", "lashroom-byanja.com");
    const metadata = tenantPageMetadata(
      profile({ logo: `${CDN}/site-logo.svg` }) as SalonProfileData,
      context,
      "/",
      "Naslov",
      "Opis",
    );
    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toContain("create-your-salon");
    expect(serialized).not.toContain("marysoll_elegant_logo");
    expect(serialized).not.toContain("https://marysoll.com");
  });

  it("tenant A pa tenant B — slika ne curi između zahteva", () => {
    const anja = tenant("the-lash-room", "lashroom-byanja.com");
    const kiki = tenant("kiki-kiss", "kikikiss.beauty");

    const anjaImage = getTenantSocialImage(
      profile({ notificationLogo: `${CDN}/anja.webp` }),
      anja,
    );
    const kikiImage = getTenantSocialImage(profile({}), kiki);

    expect(anjaImage).toBe(`${CDN}/anja.webp`);
    expect(kikiImage).toBe("https://kikikiss.beauty/favicon.ico");
    // Drugi tenant ne sme da pokupi sliku prvog
    expect(kikiImage).not.toContain("anja");
  });

  it("og:image i twitter:image su ista tenant slika", () => {
    const context = tenant("the-lash-room", "lashroom-byanja.com");
    const metadata = tenantPageMetadata(
      profile({ notificationLogo: `${CDN}/anja.webp` }) as SalonProfileData,
      context,
      "/",
      "Naslov",
      "Opis",
    );
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: `${CDN}/anja.webp` }],
    });
    expect(metadata.twitter).toMatchObject({ images: [`${CDN}/anja.webp`] });
  });
});
