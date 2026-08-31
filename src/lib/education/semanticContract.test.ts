import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_TWELVE_BLOCKS } from "./__fixtures__/education-blocks";
import {
  formatPublishedDate,
  formatReadingTime,
  readingTimeMinutes,
  educationAuthorFromSalon,
  resolveArticlePresentation,
} from "./presentation";

const SRC = process.cwd() + "/src";
const read = (file: string) => readFileSync(path.join(SRC, file), "utf8");

describe("semantički ugovor javne Education strane", () => {
  it("samo hero blok sme `h1`, i to samo kad je on cela strana", () => {
    const dir = path.join(SRC, "components/content-composer/blocks");
    const offenders = readdirSync(dir)
      .filter((file) => file.endsWith(".tsx"))
      .filter((file) => /<h1[\s>]/.test(readFileSync(path.join(dir, file), "utf8")));

    // Nijedan blok ne sme da ispisuje `h1` bezuslovno; hero ga bira po opsegu.
    expect(offenders).toEqual([]);

    const hero = read("components/content-composer/blocks/HeroBlock.tsx");
    expect(hero).toContain('headingScope === "page" ? "h1" : "h2"');
  });

  it("Education detalj nosi jedan `h1` i spušta blokove na `h2`", () => {
    const view = read("components/tenant/EducationArticleView.tsx");

    expect(view.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(view).toContain('headingScope="section"');
  });

  it("telo članka i lista dele kontejner sa theme-9 header-om", () => {
    // Bez ovoga sadržaj ne stoji u istoj liniji sa navigacijom iznad njega.
    const header = read("components/themes/theme-9/Header.tsx");
    expect(header).toContain("max-w-[1240px]");

    for (const file of [
      "components/tenant/EducationArticleView.tsx",
      "components/tenant/EducationListView.tsx",
    ]) {
      expect(read(file)).toContain("max-w-[1240px]");
    }
  });

  it("telo članka nosi tipografiju teme, ne neutralnu iz blokova", () => {
    // Blokovi su deljeni sa newsletterom, pa se stil daje omotačem umesto
    // račvanjem dvanaest blokova po temi.
    expect(read("components/tenant/EducationArticleView.tsx")).toContain(
      "edu-prose",
    );

    // Komentari se skidaju: objašnjenje pravila pominje `!important` upravo
    // zato što se ne koristi.
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const eduProse = css.slice(css.indexOf(".edu-prose"));

    expect(eduProse).toContain("--font-newsreader");
    expect(eduProse).toContain("--color-ee-accent");
    // Selektor tipa `.edu-prose h2` je specifičniji od utility klase, pa
    // nadjačava blok bez `!important`. Ako se ovo pojavi, pravilo je pukло.
    expect(eduProse).not.toContain("!important");
  });

  it("koristi prave elemente umesto div-ova", () => {
    const view = read("components/tenant/EducationArticleView.tsx");

    expect(view).toContain("<article");
    expect(view).toContain("<header");
    expect(view).toContain("<figure");
    expect(view).toContain("<time dateTime=");
  });

  it("breadcrumb je `nav` sa oznakom i tekućom stavkom", () => {
    const crumb = read("components/tenant/EducationBreadcrumb.tsx");

    expect(crumb).toContain('aria-label="Breadcrumb"');
    expect(crumb).toContain("<ol");
    expect(crumb).toContain('aria-current="page"');
  });

  it("callout i autor su `aside`, ne obični blokovi teksta", () => {
    expect(read("components/content-composer/blocks/CalloutBlock.tsx")).toContain("<aside");
    expect(read("components/tenant/EducationAuthorBox.tsx")).toContain("<aside");
  });

  it("lista ima tačno jedan `h1`, a kartice `h2`", () => {
    const list = read("components/tenant/EducationListView.tsx");

    expect(list.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(list.match(/<h2[\s>]/g) ?? []).toHaveLength(2);
    expect(list).toContain("<ul");
    expect(list).toContain("<time dateTime=");
  });

  it("zaključan sadržaj deli isto zaglavlje, ali telo ne renderuje", () => {
    const gate = read("components/tenant/EducationGateView.tsx");

    // Gate NE sme sam da poziva BlockList — zaključan tekst ne sme u HTML.
    expect(gate).toContain("EducationArticleView");
    expect(gate).not.toContain("BlockList");
    expect(gate).toContain('aria-label="Pristup sadržaju"');
  });
});

describe("metapodaci članka", () => {
  it("vreme čitanja se računa iz stvarnog teksta blokova", () => {
    const minutes = readingTimeMinutes(ALL_TWELVE_BLOCKS);

    expect(minutes).toBeGreaterThanOrEqual(1);
    expect(formatReadingTime(minutes)).toMatch(/min čitanja$/);
  });

  it("zaključan sadržaj nema telo, pa nema ni vreme čitanja", () => {
    // `null` znači „ne prikazuj", ne „nula minuta".
    expect(readingTimeMinutes([])).toBeNull();
    expect(formatReadingTime(null)).toBeNull();
  });

  it("datum se prikazuje čitljivo, a neispravan ne ruši stranu", () => {
    expect(formatPublishedDate("2026-08-29T10:00:00.000Z")).toContain("2026");
    expect(formatPublishedDate("nije datum")).toBe("");
  });

  it("autor je salon; bez imena nema autorske kutije", () => {
    expect(
      educationAuthorFromSalon({
        name: "Marina B. Stanisavljević",
        shortDescription: "Skincare edukacija",
        logo: "https://cdn.example.com/marina.jpg",
      }),
    ).toEqual({
      name: "Marina B. Stanisavljević",
      role: "Skincare edukacija",
      image: "https://cdn.example.com/marina.jpg",
    });

    expect(educationAuthorFromSalon(null)).toBeNull();
    expect(educationAuthorFromSalon({ name: "" })).toBeNull();
  });

});

describe("hero blok se ne prikazuje dvaput", () => {
  const hero = {
    id: "hero",
    type: "HeroBlock" as const,
    priority: 1,
    title: "ESTETIKA LICA",
    subtitle: "Anatomija, proporcije, prirodnost i granica prenaglašenosti",
    images: [
      {
        src: "https://cdn.example.com/hero.jpg",
        alt: "Lice",
        focalPoint: { x: 0.3, y: 0.2 },
      },
    ],
  };
  const body = ALL_TWELVE_BLOCKS.filter((block) => block.type !== "HeroBlock");

  it("izbacuje se iz tela, jer zaglavlje strane već nosi naslovnu sekciju", () => {
    const { blocks } = resolveArticlePresentation({
      blocks: [hero, ...body],
    });

    expect(blocks.map((block) => block.type)).not.toContain("HeroBlock");
    expect(blocks).toHaveLength(body.length);
  });

  it("njegov podnaslov i slika postaju zaglavlje", () => {
    const presentation = resolveArticlePresentation({ blocks: [hero, ...body] });

    expect(presentation.description).toBe(hero.subtitle);
    expect(presentation.cover?.src).toBe(hero.images[0].src);
  });

  it("naslovna slika nosi izabrani fokus kadra", () => {
    // Bez ovoga se hero slika u zaglavlju i na kartici seče po centru, bez
    // obzira na to šta je autor izabrao klikom.
    const presentation = resolveArticlePresentation({ blocks: [hero, ...body] });

    expect(presentation.cover?.focalPoint).toEqual({ x: 0.3, y: 0.2 });
  });

  it("hero ima prednost nad SEO poljima, jer je pisan za čitaoca", () => {
    const presentation = resolveArticlePresentation({
      description: "SEO opis za pretragu",
      cover: { src: "https://cdn.example.com/og.jpg" },
      blocks: [hero, ...body],
    });

    expect(presentation.description).toBe(hero.subtitle);
    expect(presentation.cover?.src).toBe(hero.images[0].src);
  });

  it("bez hero bloka zaglavlje pada na SEO", () => {
    const presentation = resolveArticlePresentation({
      description: "SEO opis za pretragu",
      cover: { src: "https://cdn.example.com/og.jpg" },
      blocks: body,
    });

    expect(presentation.description).toBe("SEO opis za pretragu");
    expect(presentation.cover?.src).toBe("https://cdn.example.com/og.jpg");
  });

  it("sadržaj bez hero bloka prolazi netaknut", () => {
    const presentation = resolveArticlePresentation({ blocks: body });

    expect(presentation.blocks).toEqual(body);
    expect(presentation.description).toBeUndefined();
    expect(presentation.cover).toBeUndefined();
  });

  it("vreme čitanja se računa bez hero bloka", () => {
    // Hero više nije u telu, pa ne sme ni da ulazi u procenu čitanja.
    const withHero = resolveArticlePresentation({ blocks: [hero, ...body] });

    expect(readingTimeMinutes(withHero.blocks)).toBe(readingTimeMinutes(body));
  });
});
