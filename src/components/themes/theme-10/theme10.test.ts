import { describe, expect, it } from "vitest";
import type { IService } from "@/types";
import type {
  ContentHeroData,
  ContentTeamData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import { THEME10_DEFAULT_IMAGES, THEME10_DEFAULT_TEAM } from "./constants";
import {
  formatDayLong,
  formatRsd,
  freeSlotsLabel,
  headlineLines,
  mondayOf,
  servicePriceLabel,
} from "./format";
import { theme10HeroProps, theme10PriceListProps, theme10TeamProps } from "./blockProps";
import { buildTheme10Nav } from "./nav";
import {
  theme10BookableServices,
  theme10DemoPriceForMaster,
  theme10MastersForService,
  theme10ServicesForMaster,
} from "./demoCatalog";

const service = (over: Partial<IService>): IService =>
  ({ _id: "s1", name: "Manikir", category: "Manikir", type: "single", ...over }) as IService;

describe("theme-10 format", () => {
  it("slaže srpsku množinu za slobodne termine", () => {
    expect(freeSlotsLabel(1)).toBe("1 slobodan");
    expect(freeSlotsLabel(3)).toBe("3 slobodna");
    expect(freeSlotsLabel(5)).toBe("5 slobodnih");
    expect(freeSlotsLabel(11)).toBe("11 slobodnih");
    expect(freeSlotsLabel(12)).toBe("12 slobodnih");
    expect(freeSlotsLabel(21)).toBe("21 slobodan");
    expect(freeSlotsLabel(22)).toBe("22 slobodna");
  });

  it("formatira cene kao 1.500 rsd", () => {
    expect(formatRsd(1500)).toBe("1.500 rsd");
    expect(formatRsd(12000)).toBe("12.000 rsd");
    expect(servicePriceLabel(service({ basePrice: 2000 }))).toBe("2.000 rsd");
    expect(servicePriceLabel(service({ priceMode: "from", basePrice: 3000 }))).toBe(
      "od 3.000 rsd",
    );
    expect(servicePriceLabel(service({ priceMode: "on_request" }))).toBe("Na upit");
    expect(servicePriceLabel(service({ basePrice: null }))).toBeNull();
  });

  it("računa ponedeljak i dug datum", () => {
    const monday = mondayOf(new Date(2026, 8, 19)); // subota
    expect(monday.getDate()).toBe(14);
    expect(formatDayLong(monday)).toBe("PON, 14. sep 2026.");
  });

  it("deli CMS naslov po redovima i pada na dizajn kad je prazan", () => {
    expect(headlineLines("Prvi\n  Drugi \n", ["X"])).toEqual(["Prvi", "Drugi"]);
    expect(headlineLines("", ["A", "B"])).toEqual(["A", "B"]);
  });
});

describe("theme-10 blockProps", () => {
  const resolveHref = (h: string) => `/salon${h}`;

  it("hero bez CMS sadržaja koristi tekst i sliku iz dizajna", () => {
    const props = theme10HeroProps({ content: undefined } as unknown as ContentHeroData, resolveHref);
    expect(props.headlineLines).toEqual(["NOKTI", "KOJI GOVORE", "O VAMA"]);
    expect(props.primaryCta).toEqual({ text: "Zakaži termin", href: "/salon/termini" });
    expect(props.secondaryCta.href).toBe("#cene");
    expect(props.image).toEqual(THEME10_DEFAULT_IMAGES.hero);
  });

  it("hero CMS slika pobeđuje podrazumevanu", () => {
    const props = theme10HeroProps(
      {
        content: { headline: "Moj salon", image: { src: "https://cdn/x.png" } },
      } as unknown as ContentHeroData,
      resolveHref,
    );
    expect(props.headlineLines).toEqual(["Moj salon"]);
    expect(props.image.src).toBe("https://cdn/x.png");
  });

  it("cenovnik bez usluga ne postoji", () => {
    expect(
      theme10PriceListProps({ content: undefined, services: [] } as ServicesCatalogData),
    ).toBeNull();
  });

  it("tim bez CMS članova pada na tim iz dizajna", () => {
    const props = theme10TeamProps(
      { content: undefined } as unknown as ContentTeamData,
      "/salon/termini",
    );
    expect(props.members).toEqual([...THEME10_DEFAULT_TEAM]);
  });

  it("CMS tim potpuno zamenjuje podrazumevani, ne dopunjuje ga", () => {
    const props = theme10TeamProps(
      {
        content: {
          headline: "Tim",
          members: [{ name: "Milica", role: "Nadograđivanje", bio: "", image: { src: "", alt: "" } }],
        },
      } as unknown as ContentTeamData,
      "/salon/termini",
    );
    expect(props.members).toEqual([{ name: "Milica", role: "Nadograđivanje" }]);
  });
});

describe("theme-10 nav", () => {
  it("izostavlja sidra sekcija kojih nema", () => {
    const nav = buildTheme10Nav("", { about: false, gallery: true, prices: false });
    expect(nav.map((n) => n.href)).toEqual(["#pocetna", "#usluge", "#galerija", "#kontakt"]);
  });

  it("na podstranici vodi nazad na početnu", () => {
    expect(buildTheme10Nav("/salon/")[0].href).toBe("/salon/#pocetna");
  });
});

describe("theme-10 privremeni Ash Studio cenovnik", () => {
  const demoServices = [
    service({ _id: "man", name: "Higijenski manikir" }),
    service({ _id: "izl", name: "Izlivanje noktiju" }),
    service({ _id: "art", name: "Art dizajn (2 nokta)" }),
    service({ _id: "ped", name: "Pedikir sa gel lakom" }),
    service({ _id: "fol", name: "Pedikir sa dizajn folijama" }),
  ];

  it("filtrira usluge po demo majstoru, bez oslanjanja na privremene DB ID-jeve", () => {
    expect(theme10ServicesForMaster(demoServices, "Anna").map((item) => item._id)).toEqual([
      "man",
      "izl",
      "art",
    ]);
    expect(theme10ServicesForMaster(demoServices, "Evgenija").map((item) => item._id)).toEqual([
      "man",
      "ped",
      "fol",
    ]);
    expect(theme10ServicesForMaster(demoServices, "Aleksandra").map((item) => item._id)).toEqual([
      "man",
      "ped",
    ]);
  });

  it("daje cenu ili em dash za majstora koji uslugu ne radi", () => {
    expect(theme10DemoPriceForMaster({ name: "Manikir sa gel lakom" }, "aleksandra")).toBe(
      "3.500 rsd",
    );
    expect(theme10DemoPriceForMaster({ name: "Izlivanje noktiju" }, "evgenija")).toBeNull();
  });

  it("u opštem bookingu nudi samo podržane usluge i njihove majstore iz handoffa", () => {
    const catalog = [
      ...demoServices,
      service({ _id: "cen", name: "Dizajn noktiju" }),
      service({ _id: "other", name: "Masaža ruku" }),
    ];
    expect(theme10BookableServices(catalog).map((item) => item._id)).toEqual([
      "man",
      "izl",
      "art",
      "ped",
      "fol",
    ]);
    expect(theme10MastersForService(catalog[0]).map((master) => master.label)).toEqual([
      "Anna",
      "Aleksandra",
      "Evgenija",
    ]);
  });
});
