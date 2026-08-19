/**
 * theme-9 — regresija mapiranja podataka bloka u propove.
 *
 * Composition test dokazuje da se `<ThemeBlock>` pozivi poklapaju sa inventarom
 * i redosledom, ali NE dokazuje da Hero i About dobijaju tačne podatke. Ovo je
 * taj drugi deo.
 *
 * Najvažnija invarijanta ovde: theme-9 CTA NIKAD ne pada na `/termini`. Ta ruta
 * je salonski Service Booking, a Consultation je zaseban domen — tihi fallback
 * bi napravio prečicu Marina → Service → Appointment.
 */
import { describe, expect, it } from "vitest";
import type { SalonProfileData } from "@/types";
import type {
  ContentAboutData,
  ContentHeroData,
} from "@/lib/platform/blocks/types";
import { theme9AboutProps, theme9HeroProps } from "./blockProps";

const identity = (href: string) => href;
const prefixed = (href: string) => `/marina${href}`;

function salon(overrides: Partial<SalonProfileData> = {}): SalonProfileData {
  return {
    name: "Marina B. Stanisavljević",
    description: "Skincare edukacija",
    ...overrides,
  } as unknown as SalonProfileData;
}

function heroData(
  content: Partial<NonNullable<ContentHeroData["content"]>> = {},
  salonOverrides: Partial<SalonProfileData> = {},
): ContentHeroData {
  return {
    content: {
      enabled: true,
      contact: {},
      ctas: { primary: { text: "", href: "" } },
      ...content,
    } as NonNullable<ContentHeroData["content"]>,
    salon: salon(salonOverrides),
    stats: undefined,
    experience: {},
  };
}

function aboutData(
  content: Partial<NonNullable<ContentAboutData["content"]>> = {},
  extra: Partial<ContentAboutData> = {},
): ContentAboutData {
  return {
    content: {
      enabled: true,
      paragraphs: [],
      ...content,
    } as NonNullable<ContentAboutData["content"]>,
    stats: undefined,
    authoredStats: undefined,
    salonName: "Marina B. Stanisavljević",
    ...extra,
  };
}

describe("theme9HeroProps", () => {
  it("mapira CMS polja na editorial hero", () => {
    const props = theme9HeroProps(
      heroData({
        headline: "Nega kože počinje od procene.",
        subheadline: "Edukativni sadržaj o zdravlju kože.",
        whereWhatForWhom: "Procena kože · Aktivni sastojci",
      }),
      identity,
    );

    expect(props.title).toBe("Nega kože počinje od procene.");
    expect(props.lead).toBe("Edukativni sadržaj o zdravlju kože.");
    expect(props.eyebrow).toBe("Skincare edukacija");
  });

  it("pada na ime salona kad headline nije upisan", () => {
    expect(theme9HeroProps(heroData(), identity).title).toBe(
      "Marina B. Stanisavljević",
    );
  });

  it("deli keywords po ·, zarezu i uspravnoj crti", () => {
    const bySeparator = (raw: string) =>
      theme9HeroProps(heroData({ whereWhatForWhom: raw }), identity).keywords;

    expect(bySeparator("Procena kože · Aktivni sastojci")).toEqual([
      "Procena kože",
      "Aktivni sastojci",
    ]);
    expect(bySeparator("Procena, Aktivni, SPF")).toEqual([
      "Procena",
      "Aktivni",
      "SPF",
    ]);
    expect(bySeparator("Procena | Aktivni")).toEqual(["Procena", "Aktivni"]);
  });

  it("seče keywords na najviše 4 i izbacuje prazne", () => {
    const props = theme9HeroProps(
      heroData({ whereWhatForWhom: "a · b · c · d · e ·  · f" }),
      identity,
    );
    expect(props.keywords).toEqual(["a", "b", "c", "d"]);
  });

  it("vraća prazan spisak keywords kad polje nije upisano", () => {
    expect(theme9HeroProps(heroData(), identity).keywords).toEqual([]);
  });

  // ── Najvažnije: nema tihog fallbacka na salonski booking ──────────────────
  it("NE postavlja href kad tenant nije sam upisao CTA — launcher ostaje inertan", () => {
    const props = theme9HeroProps(heroData(), identity);
    expect(props.primaryCta.href).toBeUndefined();
    expect(props.primaryCta.text).toBe("Zakaži konsultaciju");
  });

  it("nikad ne pada na /termini ni na /usluge", () => {
    const props = theme9HeroProps(heroData(), identity);
    expect(props.primaryCta.href).not.toBe("/termini");
    expect(props.secondaryCta).toBeUndefined();
  });

  it("poštuje href koji je tenant upisao, kroz resolveHref", () => {
    const props = theme9HeroProps(
      heroData({
        ctas: {
          primary: { text: "Zakaži", href: "/kontakt" },
          secondary: { text: "Istraži", href: "/blogs" },
        },
      }),
      prefixed,
    );

    expect(props.primaryCta).toEqual({ text: "Zakaži", href: "/marina/kontakt" });
    expect(props.secondaryCta).toEqual({
      text: "Istraži",
      href: "/marina/blogs",
    });
  });

  it("uzima sliku iz `image`, pa iz `images[0]`, i pravi alt fallback", () => {
    const single = theme9HeroProps(
      heroData({ image: { src: "/a.webp", alt: "Portret" } }),
      identity,
    );
    expect(single.image).toEqual({ url: "/a.webp", alt: "Portret" });

    const fromList = theme9HeroProps(
      heroData({ images: [{ src: "/b.webp" }] }),
      identity,
    );
    expect(fromList.image).toEqual({
      url: "/b.webp",
      alt: "Marina B. Stanisavljević",
    });

    expect(theme9HeroProps(heroData(), identity).image).toBeUndefined();
  });

  it("gradi inicijale badge-a iz prve dve reči imena", () => {
    expect(theme9HeroProps(heroData(), identity).badge).toEqual({
      initials: "MB",
      name: "Marina B. Stanisavljević",
    });
  });
});

describe("theme9AboutProps", () => {
  it("mapira headline, pasuse i sliku", () => {
    const props = theme9AboutProps(
      aboutData({
        headline: "O meni",
        paragraphs: ["Prvi pasus.", "Drugi pasus."],
        image: { src: "/about.webp", alt: "Marina" },
      }),
    );

    expect(props.headline).toBe("O meni");
    expect(props.paragraphs).toEqual(["Prvi pasus.", "Drugi pasus."]);
    expect(props.image).toEqual({ url: "/about.webp", alt: "Marina" });
  });

  it("izbacuje prazne pasuse", () => {
    const props = theme9AboutProps(
      aboutData({ paragraphs: ["Tekst.", "", "  Drugi."] }),
    );
    expect(props.paragraphs).toEqual(["Tekst.", "  Drugi."]);
  });

  it("pada na ime salona kad headline nije upisan", () => {
    expect(theme9AboutProps(aboutData()).headline).toBe(
      "Marina B. Stanisavljević",
    );
  });

  // PRELAZNO — briše se kad stigne blok `content.credentials`.
  it("prelazno mapira authoredStats u kredencijale", () => {
    const props = theme9AboutProps(
      aboutData({}, { authoredStats: [{ label: "Praksa", value: "8 godina" }] }),
    );
    expect(props.credentials).toEqual([
      { label: "Praksa", value: "8 godina" },
    ]);
  });

  it("bez authoredStats kredencijali su prazni, ne undefined", () => {
    expect(theme9AboutProps(aboutData()).credentials).toEqual([]);
  });
});
