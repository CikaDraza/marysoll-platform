import type { MarketingBanner, Theme8SystemSectionId } from "@/types/theme8-marketing";

export const THEME8_SYSTEM_SECTION_ORDER = [
  "hero",
  "about",
  "social-proof",
  "services",
  "gallery",
  "perks",
  "testimonials",
  "faq",
  "tribute",
] as const satisfies readonly Theme8SystemSectionId[];

const SYSTEM_IDS = new Set<string>(THEME8_SYSTEM_SECTION_ORDER);
export const marketingSectionId = (bannerId: string) => `marketing:${bannerId}`;

function isValidSavedOrder(saved: readonly string[], bannerIds: ReadonlySet<string>): boolean {
  if (saved[0] !== "hero" || new Set(saved).size !== saved.length) return false;
  const systems = saved.filter((id) => SYSTEM_IDS.has(id));
  if (systems.length !== THEME8_SYSTEM_SECTION_ORDER.length) return false;
  if (!systems.every((id, index) => id === THEME8_SYSTEM_SECTION_ORDER[index])) return false;
  return saved.every((id) => SYSTEM_IDS.has(id) ||
    (id.startsWith("marketing:") && bannerIds.has(id.slice(10))));
}

function appendMissingBanners(saved: readonly string[], bannerIds: readonly string[]): string[] {
  const result = [...saved];
  const referenced = new Set(saved.filter((id) => id.startsWith("marketing:")));
  let insertAt = result.findLastIndex((id) => id.startsWith("marketing:"));
  if (insertAt < 0) insertAt = result.indexOf("gallery");
  for (const bannerId of bannerIds) {
    const id = marketingSectionId(bannerId);
    if (referenced.has(id)) continue;
    result.splice(++insertAt, 0, id);
  }
  return result;
}

/** Old tenants have no saved order. Invalid orders also fall back safely. */
export function resolveTheme8SectionOrder(
  saved: readonly string[] | undefined,
  bannerIds: readonly string[],
): string[] {
  if (saved?.length && isValidSavedOrder(saved, new Set(bannerIds))) {
    return appendMissingBanners(saved, bannerIds);
  }
  const fallback: string[] = [...THEME8_SYSTEM_SECTION_ORDER];
  fallback.splice(fallback.indexOf("gallery") + 1, 0, ...bannerIds.map(marketingSectionId));
  return fallback;
}

/** Only banners move. Swapping past a system entry keeps system order intact. */
export function moveMarketingBanner(order: readonly string[], bannerId: string, delta: -1 | 1): string[] {
  const index = order.indexOf(marketingSectionId(bannerId));
  const target = index + delta;
  if (index < 0 || target <= 0 || target >= order.length) return [...order];
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function insertMarketingBanner(order: readonly string[], bannerId: string): string[] {
  const next = [...order];
  const lastBanner = next.findLastIndex((id) => id.startsWith("marketing:"));
  const after = lastBanner >= 0 ? lastBanner : next.indexOf("gallery");
  next.splice(after + 1, 0, marketingSectionId(bannerId));
  return next;
}

export const EDUCATION_BANNER_PRESET: MarketingBanner = {
  id: "education",
  name: "Edukacija",
  enabled: false,
  title: "Investiraj u znanje koje možeš da pretvoriš u svoj posao.",
  description: "Započni svoj lash journey uz edukaciju u Lashroom by Anja. ♡",
  accentPhrase: "lash journey uz edukaciju u Lashroom by Anja. ♡",
  image: {
    url: "/images/theme-8/edu-the-lash-room-byAnja.jpg",
    alt: "Edukacija za lash artiste u The Lash Room by Anja",
  },
  containerStyle: "contained",
  cta: {
    enabled: false,
    label: "Saznaj više",
    destination: { type: "custom", url: "" },
  },
};
