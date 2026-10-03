import { renderToStaticMarkup } from "react-dom/server";
import type { LandingStructure, SalonProfileData } from "@/types";
import type { PublicEducationSummary } from "@/lib/education/publicContent";
import { landingStructureToThemeDocument } from "@/lib/platform/theme-client";
import { FEATURE_BLOCK_REGISTRY } from "@/lib/platform/blocks/registry";
import { preloadedBlockDataSource } from "@/lib/platform/blocks/deps";
import type { EducationTopicHubData } from "@/lib/platform/blocks/types";
import { resolveEducationTaxonomy } from "@/lib/education/taxonomy";
import { theme9EducationTopicHubProps } from "./blockProps";
import { Theme9TopicHub } from "./TopicHub";

function items(count: number): PublicEducationSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    slug: `clanak-${index + 1}`,
    title: `Objavljen članak ${index + 1}`,
    kind: "article",
    format: "article",
    accessMode: "public",
    publishedAt: "2026-10-03T10:00:00.000Z",
    topicKey: "assessment",
    intentKey: "recognize",
    coverOnPage: false,
  }));
}

async function renderDiscovery(count: number) {
  // A real tenant with no manually authored topicHub. The old adapter omitted
  // the block entirely, even though published Education records were available.
  const document = landingStructureToThemeDocument(undefined, { theme: "theme-9" });
  const block = document.sections.find(({ id }) => id === "topicHub")?.blocks[0];
  expect(block?.type).toBe("education.topic-hub");
  const deps = preloadedBlockDataSource({
    salon: { name: "Novi centar", isDemo: false } as SalonProfileData,
    services: [],
    testimonials: [],
    educationDiscovery: async () => ({
      items: items(count),
      taxonomy: resolveEducationTaxonomy("skincare"),
    }),
  });
  const data = await FEATURE_BLOCK_REGISTRY.get("education.topic-hub")!.load({
    theme: "theme-9",
    config: { source: "topicHub" },
    deps,
  }) as EducationTopicHubData;
  const props = theme9EducationTopicHubProps(data, (href) => `/novi-centar${href}`);
  return renderToStaticMarkup(<Theme9TopicHub {...props} />);
}

describe("E1 unconfigured live landing discovery", () => {
  it.each([0, 1, 2, 3])("renders no section for %i published records", async (count) => {
    expect(await renderDiscovery(count)).toBe("");
  });

  it.each([[4, 4], [5, 5], [6, 6], [9, 6]])(
    "renders %i records as %i linked cards without CMS fixture content",
    async (count, visible) => {
      const html = await renderDiscovery(count);
      expect(html).toContain('id="teme"');
      expect(html).toContain("Znanje koje možete primeniti");
      expect(html.match(/<li\b/g)).toHaveLength(visible);
      expect(html).toContain('href="/novi-centar/edukacija/clanak-1"');
      expect(html).toContain("Procena kože");
      expect(html).toContain("Kako prepoznati");
      expect(html).not.toContain("Objavljen članak 7");
    },
  );

  it("honors an explicit OFF and does not change other themes' empty CMS policy", () => {
    const disabled = { landing: { topicHub: { enabled: false } } } as LandingStructure;
    for (const document of [
      landingStructureToThemeDocument(disabled, { theme: "theme-9" }),
      landingStructureToThemeDocument(undefined, { theme: "theme-2" }),
    ]) {
      expect(document.sections.some(({ id }) => id === "topicHub")).toBe(false);
    }
  });
});
