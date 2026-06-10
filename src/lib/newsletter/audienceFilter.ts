// lib/newsletter/audienceFilter.ts
//
// Single source of truth for PLATFORM newsletter audience segmentation.
//
// The platform audience is defined purely by `tenantId = null` + `subscribed`
// + `status: ACTIVE`. `contactType` is intentionally NOT a hard inclusion gate
// (that previously dropped legitimate "NEWSLETTER" signups) — it is only used
// as an optional segment label here, chosen per-campaign:
//   - "all"    → everyone at platform level (no contactType condition)
//   - "leads"  → interested parties who are not owners
//   - "owners" → salon owners who opted into platform news
//
// Used by both the recipient resolver (send) and the subscribers listing so the
// preview list always matches who will actually receive the campaign.

export const PLATFORM_AUDIENCE_FILTERS = ["all", "leads", "owners"] as const;
export type PlatformAudienceFilter = (typeof PLATFORM_AUDIENCE_FILTERS)[number];

export function normalizePlatformAudienceFilter(
  value: unknown,
): PlatformAudienceFilter {
  return PLATFORM_AUDIENCE_FILTERS.includes(value as PlatformAudienceFilter)
    ? (value as PlatformAudienceFilter)
    : "all";
}

/**
 * Mongo `contactType` condition for a given platform segment.
 * Returns an empty object for "all" (no condition → no gate).
 */
export function platformAudienceContactTypeCondition(
  filter: PlatformAudienceFilter,
): Record<string, unknown> {
  switch (filter) {
    case "leads":
      return { contactType: { $in: ["NEWSLETTER", "LEAD"] } };
    case "owners":
      return { contactType: { $in: ["SALON_OWNER"] } };
    case "all":
    default:
      return {};
  }
}

/** Serbian labels for the campaign-creation select. */
export const PLATFORM_AUDIENCE_FILTER_LABELS: Record<
  PlatformAudienceFilter,
  string
> = {
  all: "Svi pretplatnici",
  leads: "Samo lead-ovi",
  owners: "Samo vlasnici salona",
};
