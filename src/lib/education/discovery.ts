import type { EducationTaxonomy, EducationTopicKey } from "./taxonomy";

export const EDUCATION_TOPIC_HUB_MIN_ITEMS = 4;
export const EDUCATION_TOPIC_HUB_MAX_ITEMS = 6;

interface TaxonomizedSummary {
  topicKey?: EducationTopicKey;
}

/** Landing contract: the section exists only with 4+ real published items. */
export function educationTopicHubItems<T>(
  items: readonly T[],
  topicKey?: EducationTopicKey,
): T[] {
  if (items.length < EDUCATION_TOPIC_HUB_MIN_ITEMS) return [];
  const eligible = topicKey
    ? items.filter(
        (item) => (item as TaxonomizedSummary).topicKey === topicKey,
      )
    : items;
  return eligible.slice(0, EDUCATION_TOPIC_HUB_MAX_ITEMS);
}

/** Only filters with at least one published match are useful to a visitor. */
export function availableEducationTopics<T>(
  items: readonly T[],
  taxonomy: EducationTaxonomy | null,
) {
  if (!taxonomy) return [];
  return taxonomy.topics.filter(({ key }) =>
    items.some((item) => (item as TaxonomizedSummary).topicKey === key),
  );
}

/** Full library filter: missing/unknown keys stay available only under Sve. */
export function filterEducationContentByTopic<T>(
  items: readonly T[],
  topicKey: "all" | EducationTopicKey,
): T[] {
  return topicKey === "all"
    ? [...items]
    : items.filter(
        (item) => (item as TaxonomizedSummary).topicKey === topicKey,
      );
}
