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
import type { MappedBlogPost } from "@/lib/tenant/blogPosts";
import {
  theme9AboutProps,
  theme9AudiencePathsProps,
  theme9CredentialsProps,
  theme9FeaturedEducationProps,
  theme9GuidedCareProcessProps,
  theme9HeroProps,
  theme9LatestEducationProps,
  theme9ProfessionalPathProps,
  theme9TopicHubProps,
} from "./blockProps";

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
        eyebrow: "Stručna edukacija o nezi kože",
        headline: "Nega kože počinje od procene.",
        subheadline: "Edukativni sadržaj o zdravlju kože.",
        whereWhatForWhom: "Procena kože · Aktivni sastojci",
      }),
      identity,
    );

    expect(props.title).toBe("Nega kože počinje od procene.");
    expect(props.lead).toBe("Edukativni sadržaj o zdravlju kože.");
    expect(props.eyebrow).toBe("Stručna edukacija o nezi kože");
  });

  // Regresija: dugačak opis salona je razbijao hero i header.
  it("eyebrow NIKAD ne pada na opis salona", () => {
    const props = theme9HeroProps(
      heroData({}, { description: "Vrlo dug opis salona koji je ranije curio u eyebrow." }),
      identity,
    );
    expect(props.eyebrow).toBeUndefined();
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

  it("kredencijali imaju svoje polje, ne pozajmljuju landing.stats", () => {
    const props = theme9AboutProps(
      aboutData({
        credentials: [
          { label: "Praksa", value: "8 godina", note: "Beograd" },
        ],
      }),
    );
    expect(props.credentials).toEqual([
      { label: "Praksa", value: "8 godina", note: "Beograd" },
    ]);
  });

  it("showCredentials: false sakriva tabelu, biografija ostaje", () => {
    const props = theme9AboutProps(
      aboutData({
        showCredentials: false,
        paragraphs: ["Biografija."],
        credentials: [{ label: "Praksa", value: "8 godina" }],
      }),
    );
    expect(props.credentials).toEqual([]);
    expect(props.paragraphs).toEqual(["Biografija."]);
  });

  it("eyebrow i pullQuote dolaze iz CMS-a, naslov pada na ime", () => {
    const withCms = theme9AboutProps(
      aboutData({ eyebrow: "Ko sam", pullQuote: "Procena pre proizvoda." }),
    );
    expect(withCms.eyebrow).toBe("Ko sam");
    expect(withCms.pullQuote).toBe("Procena pre proizvoda.");
    expect(theme9AboutProps(aboutData()).eyebrow).toBe("O meni");
  });

  it("bez authoredStats kredencijali su prazni, ne undefined", () => {
    expect(theme9AboutProps(aboutData()).credentials).toEqual([]);
  });
});

// ─── autorske sekcije theme-9 ────────────────────────────────────────────────
// Zajednička invarijanta svih šest: prazan CMS daje PRAZAN NIZ, nikad
// `undefined` — komponenta sme da radi `.map` bez guarda.

describe("theme9 autorske sekcije — prazan CMS", () => {
  it("svi maperi vraćaju prazne nizove umesto undefined", () => {
    expect(
      theme9AudiencePathsProps({ content: undefined }, identity).paths,
    ).toEqual([]);

    const hub = theme9TopicHubProps({ content: undefined }, identity);
    expect(hub.topics).toEqual([]);
    expect(hub.filters).toEqual([]);

    expect(
      theme9GuidedCareProcessProps({ content: undefined }).steps,
    ).toEqual([]);
    expect(theme9CredentialsProps({ content: undefined }).pillars).toEqual([]);
    expect(
      theme9FeaturedEducationProps({ content: undefined }, identity).learn,
    ).toEqual([]);
    expect(
      theme9ProfessionalPathProps({ content: undefined }, identity).formats,
    ).toEqual([]);
  });
});

describe("theme9AudiencePathsProps", () => {
  it("prolazi href kroz resolveHref, a bez href-a ga izostavlja", () => {
    const props = theme9AudiencePathsProps(
      {
        content: {
          enabled: true,
          paths: [
            { id: "a", title: "Lična nega", href: "/za-klijente", tone: "surface" },
            { id: "b", title: "Saloni" },
          ],
        },
      },
      prefixed,
    );

    expect(props.paths[0].href).toBe("/marina/za-klijente");
    expect(props.paths[1].href).toBeUndefined();
    expect(props.paths[1].bullets).toEqual([]);
  });
});

describe("theme9TopicHubProps", () => {
  it("čuva group kao ključ filtera i normalizuje tagove", () => {
    const props = theme9TopicHubProps(
      {
        content: {
          enabled: true,
          filters: [{ id: "aktivni", label: "Aktivni sastojci" }],
          topics: [
            { id: "t1", title: "Retinol", group: "aktivni", tags: ["nega"] },
            { id: "t2", title: "SPF" },
          ],
        },
      },
      identity,
    );

    expect(props.filters).toEqual([{ id: "aktivni", label: "Aktivni sastojci" }]);
    expect(props.topics[0].group).toBe("aktivni");
    expect(props.topics[1].tags).toEqual([]);
  });
});

describe("theme9FeaturedEducationProps", () => {
  it("uvek daje četiri reda detalja, redom format → trajanje → datum → cena", () => {
    const props = theme9FeaturedEducationProps(
      { content: { enabled: true, details: { format: "Online" } } },
      identity,
    );

    expect(props.details.map((d) => d.label)).toEqual([
      "Format",
      "Trajanje",
      "Datum početka",
      "Cena",
    ]);
    expect(props.details[0].value).toBe("Online");
    expect(props.details[1].value).toBeUndefined();
  });

  it("pendingLabel ima podrazumevanu vrednost", () => {
    expect(
      theme9FeaturedEducationProps({ content: undefined }, identity).pendingLabel,
    ).toBe("Uskoro");
    expect(
      theme9FeaturedEducationProps(
        { content: { enabled: true, pendingLabel: "Marina potvrđuje" } },
        identity,
      ).pendingLabel,
    ).toBe("Marina potvrđuje");
  });

  it("razrešava CTA href, a bez CTA ga izostavlja", () => {
    expect(
      theme9FeaturedEducationProps(
        { content: { enabled: true, cta: { text: "Prijavi", href: "/prijava" } } },
        prefixed,
      ).cta,
    ).toEqual({ text: "Prijavi", href: "/marina/prijava" });

    expect(
      theme9FeaturedEducationProps({ content: { enabled: true } }, identity).cta,
    ).toBeUndefined();
  });
});

describe("theme9ProfessionalPathProps", () => {
  it("prenosi formate i razrešava CTA", () => {
    const props = theme9ProfessionalPathProps(
      {
        content: {
          enabled: true,
          formats: [{ title: "Radionica", priceFrom: "od 30.000 RSD" }],
          cta: { text: "Zatraži predlog", href: "/kontakt" },
        },
      },
      prefixed,
    );

    expect(props.formats).toHaveLength(1);
    expect(props.formats[0].priceFrom).toBe("od 30.000 RSD");
    expect(props.cta?.href).toBe("/marina/kontakt");
  });
});

describe("theme9LatestEducationProps", () => {
  const post = { _id: "p1", title: "Retinol" } as MappedBlogPost;

  it("prosleđuje objave iz loadera — bez klijentskog dohvata", () => {
    const props = theme9LatestEducationProps(
      {
        content: { enabled: true, headline: "Tekstovi" },
        author: { name: "Marina" },
        posts: [post],
      },
      "marina",
    );

    expect(props.posts).toEqual([post]);
    expect(props.headline).toBe("Tekstovi");
    expect(props.tenantSlug).toBe("marina");
  });

  it("prazan spisak objava ostaje prazan niz", () => {
    expect(
      theme9LatestEducationProps(
        { content: undefined, author: { name: "Marina" }, posts: [] },
        undefined,
      ).posts,
    ).toEqual([]);
  });
});
