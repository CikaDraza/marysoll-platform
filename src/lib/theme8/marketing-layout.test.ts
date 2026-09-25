import { describe, expect, it } from "vitest";
import { landingStructureToThemeDocument } from "@/lib/platform/theme-client";
import { preloadedBlockDataSource } from "@/lib/platform/blocks/deps";
import { resolveBlockData } from "@/lib/platform/blocks/resolve";
import { findDocumentBlock, lookupThemeBlock } from "@/components/themes/blocks/selection";
import type { SalonProfileData } from "@/types";
import type { LandingStructure } from "@/types";
import type { MarketingBanner } from "@/types/theme8-marketing";
import {
  EDUCATION_BANNER_PRESET,
  THEME8_SYSTEM_SECTION_ORDER,
  insertMarketingBanner,
  moveMarketingBanner,
  resolveTheme8SectionOrder,
} from "./marketing-layout";
import { marketingBannersSchema } from "./marketing-validation";

const voucher: MarketingBanner = {
  id: "voucher",
  enabled: true,
  image: { url: "/images/theme-8/voucher.jpg", alt: "Poklon vaučer" },
  containerStyle: "contained",
};

describe("Theme-8 repeatable composition", () => {
  it("stari tenant bez order-a zadržava potpuno isti raspored", () => {
    expect(resolveTheme8SectionOrder(undefined, [])).toEqual(THEME8_SYSTEM_SECTION_ORDER);
  });

  it("baneri mogu preći preko zaključanih sekcija, ali ne iznad Hero-a", () => {
    const initial = resolveTheme8SectionOrder(undefined, ["education", "voucher"]);
    const up = moveMarketingBanner(initial, "education", -1);
    expect(up.indexOf("marketing:education")).toBe(up.indexOf("gallery") - 1);
    const atTop = ["hero", "marketing:education", ...THEME8_SYSTEM_SECTION_ORDER.slice(1)];
    expect(moveMarketingBanner(atTop, "education", -1)).toEqual(atTop);
    expect(up.filter((id) => !id.startsWith("marketing:"))).toEqual(THEME8_SYSTEM_SECTION_ORDER);
  });

  it("novi banner ide ispod poslednjeg banera i ne menja redosled sistema", () => {
    const initial = resolveTheme8SectionOrder(undefined, ["education"]);
    const next = insertMarketingBanner(initial, "voucher");
    expect(next.slice(next.indexOf("marketing:education"), next.indexOf("marketing:voucher") + 1))
      .toEqual(["marketing:education", "marketing:voucher"]);
    expect(next.filter((id) => !id.startsWith("marketing:"))).toEqual(THEME8_SYSTEM_SECTION_ORDER);
  });

  it("neispravan order pada na podrazumevani bez gubitka banera", () => {
    expect(resolveTheme8SectionOrder(["marketing:education", "hero"], ["education"]))
      .toEqual(resolveTheme8SectionOrder(undefined, ["education"]));
  });

  it("samo uključeni baneri ulaze u ThemeDocument i svaki ima svoj block ID", () => {
    const ls = {
      landing: {}, pages: {},
      marketingBanners: [EDUCATION_BANNER_PRESET, voucher],
    } as unknown as LandingStructure;
    const doc = landingStructureToThemeDocument(ls, { theme: "theme-8" });
    const bannerBlocks = doc.sections.flatMap((section) => section.blocks)
      .filter((block) => block.type === "content.marketing-banner");
    expect(bannerBlocks).toEqual([expect.objectContaining({
      id: "marketing-voucher-block", config: { bannerId: "voucher" },
    })]);
    expect(landingStructureToThemeDocument(ls, { theme: "theme-1" }).sections
      .some((section) => section.id === "marketing:voucher")).toBe(false);
  });

  it("dve uključene instance dobijaju različite podatke i lookup po ID-ju", async () => {
    const education = { ...EDUCATION_BANNER_PRESET, enabled: true };
    const ls = {
      landing: {}, pages: {}, marketingBanners: [education, voucher],
    } as unknown as LandingStructure;
    const document = landingStructureToThemeDocument(ls, { theme: "theme-8" });
    const data = await resolveBlockData({
      document,
      theme: "theme-8",
      deps: preloadedBlockDataSource({
        salon: { name: "The Lash Room", landingStructure: ls } as SalonProfileData,
        services: [], testimonials: [],
      }),
    });
    expect(data["marketing-education-block"]?.data).toEqual({ content: education });
    expect(data["marketing-voucher-block"]?.data).toEqual({ content: voucher });
    expect(findDocumentBlock(document, "content.marketing-banner", "marketing-voucher-block")?.id)
      .toBe("marketing-voucher-block");
    expect(lookupThemeBlock({ document, type: "content.marketing-banner",
      blockId: "marketing-voucher-block", data, theme: "theme-8" }).status).toBe("render");
  });

  it("CTA može da otvori vaučer modal bez linka", () => {
    expect(marketingBannersSchema.safeParse([{
      ...voucher,
      cta: { enabled: true, label: "Pokloni vaučer", destination: { type: "modal" } },
    }]).success).toBe(true);
  });

  it("aktivna cela širina traži pozadinu i ispravan CTA link", () => {
    const invalid = { ...voucher, containerStyle: "full-width" as const,
      cta: { enabled: true, label: "Saznaj više", destination: { type: "custom" as const, url: "javascript:alert(1)" } } };
    expect(marketingBannersSchema.safeParse([invalid]).success).toBe(false);
    expect(marketingBannersSchema.safeParse([{ ...invalid,
      backgroundImage: { url: "/images/bg.jpg" },
      cta: { ...invalid.cta, destination: { type: "custom" as const, url: "/edukacija" } },
    }]).success).toBe(true);
  });
});
