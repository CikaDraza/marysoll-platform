import type { EditorialAudience, EditorialCategory } from "@/types/newsletter";

export const CLIENT_EDITORIAL_CATEGORIES = [
  "Makeup",
  "Nails",
  "Hair",
  "Massage",
  "Beauty",
] as const;

export const PARTNER_EDITORIAL_CATEGORIES = [
  "Affiliate",
  "Growth",
  "Booking visibility",
  "AI marketing",
  "Online scheduling",
] as const;

const partnerCategorySet = new Set(
  PARTNER_EDITORIAL_CATEGORIES.map((category) => category.toLowerCase()),
);

export function normalizeEditorialAudience(
  value: unknown,
  canUsePartnerAudience: boolean,
): EditorialAudience {
  if (canUsePartnerAudience && value === "partner") return "partner";
  return "client";
}

export function normalizeEditorialCategory(
  value: unknown,
  audience: EditorialAudience,
): EditorialCategory {
  const category = typeof value === "string" ? value.trim() : "";

  if (audience === "partner") {
    return PARTNER_EDITORIAL_CATEGORIES.some((item) => item === category)
      ? category
      : "Growth";
  }

  if (!category || partnerCategorySet.has(category.toLowerCase())) {
    return "Beauty";
  }

  return category;
}
