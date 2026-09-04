import { describe, expect, it, vi } from "vitest";
import type { LandingStructure, SalonProfileData } from "@/types";
import { preloadedBlockDataSource } from "./deps";
import { FEATURE_BLOCK_REGISTRY } from "./registry";
import { resolveEducationTaxonomy } from "@/lib/education/taxonomy";
import type { EducationTopicHubData } from "./types";
import type { PublicEducationSummary } from "@/lib/education/publicContent";
import type { EducationTaxonomy } from "@/lib/education/taxonomy";

const authored = {
  landing: {
    topicHub: {
      enabled: true,
      eyebrow: "Teme",
      headline: "Znanje",
      filters: [{ id: "fake", label: "Fixture filter" }],
      topics: [{ id: "fixture", title: "Fixture article", tags: [] }],
    },
  },
} as unknown as LandingStructure;

function deps(
  isDemo: boolean,
  educationDiscovery: () => Promise<{
    items: PublicEducationSummary[];
    taxonomy: EducationTaxonomy | null;
  } | null> = vi.fn(async () => null),
) {
  return preloadedBlockDataSource({
    salon: {
      name: "Education workspace",
      description: "",
      isDemo,
      landingStructure: authored,
    } as unknown as SalonProfileData,
    services: [],
    testimonials: [],
    landingStructure: authored,
    educationDiscovery,
  });
}

async function load(source: ReturnType<typeof deps>) {
  const definition = FEATURE_BLOCK_REGISTRY.get("education.topic-hub")!;
  return definition.load({
    theme: "theme-9",
    config: { source: "topicHub" },
    deps: source,
  }) as Promise<EducationTopicHubData>;
}

describe("education.topic-hub data boundary", () => {
  it("uses authored cards only for an explicit demo profile", async () => {
    const educationDiscovery = vi.fn(async () => null);
    const result = await load(deps(true, educationDiscovery));
    expect(result).toMatchObject({ mode: "demo", items: [] });
    expect(result.content?.topics?.[0]?.id).toBe("fixture");
    expect(educationDiscovery).not.toHaveBeenCalled();
  });

  it("never substitutes authored cards for an empty real tenant", async () => {
    const educationDiscovery = vi.fn(async () => ({
      items: [],
      taxonomy: resolveEducationTaxonomy("skincare"),
    }));
    const result = await load(deps(false, educationDiscovery));
    expect(result).toMatchObject({ mode: "live", items: [] });
    expect(educationDiscovery).toHaveBeenCalledOnce();
  });
});
