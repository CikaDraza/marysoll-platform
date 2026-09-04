import { normalizePriceMode } from "@/helpers/formatPrice";
import { serviceRequiresIntake } from "@/lib/appointments/serviceIntake";
import { subdocRef } from "@/lib/booking/subdocRef";
import type { IService } from "@/types";

/**
 * Jedina granica između persistence Service dokumenta i BookingWidget DTO-a.
 * Poslovna konfiguracija `bookingIntake` ostaje na serveru; svi presentation
 * potrošači dobijaju samo već rešenu činjenicu `intakeEnabled`.
 */
export function toBookingServicePresentation(
  raw: Record<string, unknown>,
): IService {
  const subscription = raw.subscription as Record<string, unknown> | undefined;

  return {
    _id: String(raw._id ?? ""),
    name: String(raw.name ?? ""),
    category: String(raw.category ?? ""),
    categorySlug: raw.categorySlug ? String(raw.categorySlug) : undefined,
    subcategory: raw.subcategory ? String(raw.subcategory) : undefined,
    type: (raw.type as IService["type"]) ?? "single",
    intakeEnabled: serviceRequiresIntake(raw as never),
    basePrice: raw.basePrice != null ? Number(raw.basePrice) : null,
    priceMode: normalizePriceMode(raw.priceMode),
    duration: raw.duration != null ? Number(raw.duration) : undefined,
    description: String(raw.description ?? ""),
    items: Array.isArray(raw.items) ? raw.items.map(String) : [],
    featured: (raw.featured as IService["featured"]) ?? undefined,
    icon: raw.icon ? String(raw.icon) : undefined,
    variants: Array.isArray(raw.variants)
      ? raw.variants.map((value: unknown) => {
          const variant = value as Record<string, unknown>;
          return {
            ref: subdocRef(variant),
            name: String(variant.name ?? ""),
            price: Number(variant.price ?? 0),
            additionalPrice:
              variant.additionalPrice != null
                ? Number(variant.additionalPrice)
                : undefined,
            priceMode: normalizePriceMode(variant.priceMode),
            duration: Number(variant.duration ?? 0),
            perItem: Boolean(variant.perItem),
            description: variant.description
              ? String(variant.description)
              : undefined,
          };
        })
      : [],
    extras: Array.isArray(raw.extras)
      ? raw.extras.map((value: unknown) => {
          const extra = value as Record<string, unknown>;
          return {
            ref: subdocRef(extra),
            name: String(extra.name ?? ""),
            price: Number(extra.price ?? 0),
            priceMode: normalizePriceMode(extra.priceMode),
            duration: Number(extra.duration ?? 0),
            perItem: Boolean(extra.perItem),
            unitLabel: extra.unitLabel ? String(extra.unitLabel) : undefined,
            allowQuantity: Boolean(extra.allowQuantity),
          };
        })
      : [],
    services: Array.isArray(raw.services)
      ? raw.services.map((value: unknown) => {
          const service = value as Record<string, unknown>;
          return {
            ref: subdocRef(service),
            name: String(service.name ?? ""),
            price: Number(service.price ?? 0),
            priceMode: normalizePriceMode(service.priceMode),
            duration: Number(service.duration ?? 0),
            description: String(service.description ?? ""),
          };
        })
      : [],
    subscription: {
      enabled: Boolean(subscription?.enabled ?? false),
      priceMonthly:
        subscription?.priceMonthly != null
          ? Number(subscription.priceMonthly)
          : null,
      startDate: subscription?.startDate
        ? String(subscription.startDate)
        : null,
      endDate: subscription?.endDate ? String(subscription.endDate) : null,
    },
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  } as IService;
}
