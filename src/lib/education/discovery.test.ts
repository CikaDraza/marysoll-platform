import { describe, expect, it } from "vitest";
import {
  availableEducationTopics,
  educationTopicHubItems,
  filterEducationContentByTopic,
} from "./discovery";
import { resolveEducationTaxonomy } from "./taxonomy";

const items = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    slug: `item-${index + 1}`,
    topicKey:
      index % 3 === 0
        ? ("assessment" as const)
        : index % 3 === 1
          ? ("conditions" as const)
          : undefined,
  }));

describe("Education landing discovery contract", () => {
  it.each([0, 1, 2, 3])("hides the whole live hub for %i items", (count) => {
    expect(educationTopicHubItems(items(count))).toEqual([]);
  });

  it.each([
    [4, 4],
    [5, 5],
    [6, 6],
    [7, 6],
    [12, 6],
  ])("shows %i eligible as at most %i newest items", (count, visible) => {
    expect(educationTopicHubItems(items(count))).toHaveLength(visible);
    expect(educationTopicHubItems(items(count))[0]?.slug).toBe("item-1");
  });

  it("filters by exact key, caps at six, and never invents legacy categories", () => {
    const all = [
      ...Array.from({ length: 8 }, (_, index) => ({
        slug: `assessment-${index}`,
        topicKey: "assessment" as const,
      })),
      { slug: "legacy" },
    ];
    expect(educationTopicHubItems(all, "assessment")).toHaveLength(6);
    expect(educationTopicHubItems(all, "conditions")).toEqual([]);
    expect(educationTopicHubItems(all).map(({ slug }) => slug)).not.toContain(
      "legacy",
    );
    expect(all.find(({ slug }) => slug === "legacy")).not.toHaveProperty(
      "topicKey",
    );
  });

  it("suppresses empty filters and keeps taxonomy ownership outside the UI", () => {
    const taxonomy = resolveEducationTaxonomy("skincare")!;
    expect(
      availableEducationTopics(items(5), taxonomy).map(({ key }) => key),
    ).toEqual(["assessment", "conditions"]);
    expect(availableEducationTopics(items(5), null)).toEqual([]);
  });

  it("filters the full library while legacy items remain only under Sve", () => {
    const library = [
      { slug: "assessment", topicKey: "assessment" as const },
      { slug: "conditions", topicKey: "conditions" as const },
      { slug: "legacy" },
      { slug: "future", topicKey: "future_topic" },
    ];
    expect(filterEducationContentByTopic(library, "all")).toEqual(library);
    expect(
      filterEducationContentByTopic(library, "assessment").map(({ slug }) => slug),
    ).toEqual(["assessment"]);
    expect(
      filterEducationContentByTopic(library, "conditions").map(({ slug }) => slug),
    ).toEqual(["conditions"]);
  });
});
