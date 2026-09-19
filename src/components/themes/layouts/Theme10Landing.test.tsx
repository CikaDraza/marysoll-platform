/**
 * Smoke render theme-10 početne strane na serveru (SSR), sa praznim i sa
 * popunjenim CMS-om. Hvata runtime greške koje tsc ne vidi i proverava da
 * isključena sekcija nestaje i iz strane i iz navigacije.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { IService, LandingStructure, SalonProfileData } from "@/types";
import type { ResolvedBlockMap } from "@/lib/platform/blocks/render-types";
import { landingStructureToThemeDocument } from "@/lib/platform/theme-client";
import { buildThemeNative } from "@/lib/platform/theme-native";
import { makeResolveHref } from "@/helpers/tenantHref";
import { Theme10Landing } from "./Theme10Landing";

const services = [
  { _id: "a", name: "Higijenski manikir", category: "Manikir", type: "single", basePrice: 1500, duration: 45, description: "" },
  { _id: "b", name: "Higijenski pedikir", category: "Pedikir", type: "single", basePrice: 2500, duration: 60, description: "Tretman stopala." },
] as unknown as IService[];

function salonWith(landing: Partial<LandingStructure["landing"]>): SalonProfileData {
  return {
    name: "Ash Studio",
    email: "ash@example.com",
    phone: "+381 60 000 00 00",
    street: "",
    city: "Subotica",
    description: "",
    social: { instagram: "https://instagram.com/ash" },
    landingTheme: "theme-10",
    landingStructure: { landing } as LandingStructure,
  } as unknown as SalonProfileData;
}

function render(salon: SalonProfileData) {
  const ls = salon.landingStructure;
  const document = landingStructureToThemeDocument(ls, { theme: "theme-10" });
  const landing = ls?.landing;
  const blockData: ResolvedBlockMap = {
    "hero-block": { id: "hero-block", type: "content.hero", schemaVersion: 1, config: {} as never, data: { content: landing?.hero, salon, stats: undefined, experience: {} } as never },
    "about-block": { id: "about-block", type: "content.about", schemaVersion: 1, config: {} as never, data: { content: landing?.about, stats: undefined, authoredStats: undefined, salonName: salon.name } as never },
    "gallery-block": { id: "gallery-block", type: "content.gallery", schemaVersion: 1, config: {} as never, data: { content: landing?.gallery, galleryVariant: "images-only", instagramFallback: "" } as never },
    "servicesPreview-block": { id: "servicesPreview-block", type: "services.catalog", schemaVersion: 1, config: {} as never, data: { content: landing?.servicesPreview, services } as never },
    "artists-block": { id: "artists-block", type: "content.team", schemaVersion: 1, config: {} as never, data: { content: landing?.artists } as never },
  };
  const themeNative = buildThemeNative("theme-10", {
    salon,
    services,
    testimonials: [],
    tenantSlug: "ash",
    clientSlug: "ash",
  });
  const header = { salonName: salon.name, salonLogo: null, primaryColor: "", secondaryColor: "" };

  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <Theme10Landing
        document={document}
        blockData={blockData}
        themeNative={themeNative}
        tenantSlug="ash"
        clientSlug="ash"
        resolveHref={makeResolveHref("ash")}
        brandingVars={{}}
        googleFontHref=""
        headerProps={header}
        footerProps={{ salonName: salon.name }}
      />
    </QueryClientProvider>,
  );
}

describe("Theme10Landing", () => {
  it("prazan CMS: prikazuje dizajn i prave usluge/kontakt salona", () => {
    const html = render(salonWith({}));
    expect(html).toContain("KOJI GOVORE");
    expect(html).toContain("/images/theme-10/evgenia-cutout.webp");
    expect(html).toContain("Higijenski pedikir");
    expect(html).toContain("2.500 rsd");
    expect(html).toContain('href="/ash/termini"');
    expect(html).toContain("Subotica");
    expect(html).toContain('href="#galerija"');
    // Bez članova tima: tri razloga umesto liste majstora.
    expect(html).toContain("Bez čekanja na odgovor");
  });

  it("CMS sadržaj pobeđuje, a isključena galerija nestaje i iz nav-a", () => {
    const html = render(
      salonWith({
        hero: { enabled: true, headline: "Moj studio", ctas: { primary: { text: "Rezerviši", href: "/termini" } }, contact: {} },
        gallery: { enabled: false, instagram: {}, treatments: [] },
        artists: { enabled: true, headline: "Tim", members: [{ name: "Anna", role: "Manikir", bio: "", image: { src: "", alt: "" } }] },
      } as unknown as Partial<LandingStructure["landing"]>),
    );
    expect(html).toContain("Moj studio");
    expect(html).not.toContain("KOJI GOVORE");
    expect(html).toContain("Rezerviši");
    expect(html).not.toContain('id="galerija"');
    expect(html).not.toContain('href="#galerija"');
    expect(html).toContain("Anna");
  });
});
