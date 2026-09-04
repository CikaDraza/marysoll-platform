import "server-only";

/**
 * Jedan izlaz iz canonical razrešavanja u ono što se UPISUJE u termin.
 *
 * `resolveBookingRequest` je odgovorio ŠTA je izabrano i koliko to traje i
 * košta. Ovaj modul odgovara kako to izgleda kao `Appointment.services[0]` —
 * na istovetan način za sve četiri površine:
 *
 *     javni widget → /api/public/.../guest
 *     klijent      → /api/appointments/create
 *     klijent      → /api/appointments/client/[id]/update   (izmena)
 *     salon        → /api/appointments/create-guest, /api/appointments/update/[id]
 *
 * Bez ovoga je svaka površina imala svoju kopiju računa: admin edit je slao
 * `price`/`duration` iz browsera, klijentska izmena je `Service.findById`
 * tražila BEZ tenant scope-a, a nijedan od ta dva puta nije dirao
 * `pricing` snapshot — pa je izmena usluge ostavljala staru cenu.
 */
import type {
  IAppointmentExtra,
  IAppointmentPricing,
  IAppointmentService,
  IAppointmentVariant,
  IService,
} from "@/types";
import {
  resolveBookingRequest,
  type BookingSelectionInput,
  type ResolvedBookingRequest,
} from "@/lib/booking/resolveBookingRequest";
import { buildPricingSnapshot } from "@/lib/appointments/pricingSnapshot";

export interface CanonicalSelection {
  resolved: ResolvedBookingRequest;
  /** Naziv termina za prikaz — „Izlivanje - Veličina 3". */
  serviceName: string;
  /** Trajanje iz kataloga. Nikad iz zahteva. */
  durationMinutes: number;
  /** `Appointment.services[0]` — izbor I iznos, spremni za upis. */
  item: IAppointmentService;
  /** Nov snapshot cene. Koristi se samo kada se izbor promenio. */
  pricing: IAppointmentPricing;
  /** Otisak izbora, za poređenje sa zatečenim stanjem termina. */
  signature: string;
}

/**
 * Otisak IZBORA, ne iznosa.
 *
 * Poređenje mora da preživi promenu cenovnika: ako salon poskupi dodatak,
 * a klijentkinja samo pomeri termin za sat vremena, to nije nov izbor i
 * dogovorena cena se ne sme prepisati novom.
 */
export function selectionSignature(input: {
  serviceId: string;
  variantName?: string | null;
  extras?: ReadonlyArray<{ name: string; quantity?: number | null }>;
}): string {
  const extras = (input.extras ?? [])
    .map((e) => `${e.name}×${e.quantity ?? 1}`)
    .sort()
    .join("|");
  return [String(input.serviceId), input.variantName ?? "", extras].join("::");
}

/** Otisak onoga što je u terminu VEĆ upisano. */
export function signatureOfAppointmentItem(
  item: IAppointmentService | undefined | null,
): string {
  if (!item) return "";
  return selectionSignature({
    serviceId: String(item.serviceId ?? ""),
    variantName: item.variants?.[0]?.name ?? null,
    extras: item.extras ?? [],
  });
}

/**
 * Izbor iz zatečenog termina, u obliku koji razume canonical resolver.
 * Koristi ga izmena koja menja SAMO datum/vreme — izbor mora ponovo proći
 * kroz istu kapiju, da izmena ne bi bila tiši put od zakazivanja.
 */
export function selectionFromAppointmentItem(
  item: IAppointmentService | undefined | null,
): BookingSelectionInput {
  return {
    ...(item?.variants?.[0]?.name
      ? { variantName: item.variants[0].name }
      : item?.serviceName
        ? { variantName: item.serviceName }
        : {}),
    extras: (item?.extras ?? []).map((e) => ({
      name: e.name,
      quantity: e.quantity ?? 1,
    })),
  };
}

function variantPartsOf(
  service: IService,
  variantName: string | null,
): IAppointmentVariant[] | undefined {
  if (!variantName) return undefined;
  const variant = service.variants?.find((v) => v.name === variantName);
  return [
    {
      name: variantName,
      // `price` je katalog u trenutku zakazivanja. Kod „na upit" ostaje `null`
      // — 0 bi značilo besplatno, a to je druga tvrdnja.
      price: variant?.priceMode === "on_request" ? null : (variant?.price ?? null),
      duration: variant?.duration ?? 0,
      perItem: variant?.perItem ?? false,
    },
  ];
}

function extraPartsOf(
  service: IService,
  extras: ReadonlyArray<{ name: string; quantity: number }>,
): IAppointmentExtra[] | undefined {
  if (extras.length === 0) return undefined;
  return extras.map((selected) => {
    const catalogue = service.extras?.find((e) => e.name === selected.name);
    return {
      name: selected.name,
      price:
        catalogue?.priceMode === "on_request" ? null : (catalogue?.price ?? null),
      duration: catalogue?.duration ?? 0,
      perItem: catalogue?.perItem ?? false,
      quantity: selected.quantity,
    };
  });
}

/**
 * Već razrešen zahtev → ono što ide u bazu.
 *
 * Odvojeno od `resolveCanonicalSelection` zbog ruta koje su `resolveBookingRequest`
 * već pozvale (zakazivanje) — one ne smeju da plate drugi upit u bazu samo da
 * bi dobile isti odgovor.
 */
export function canonicalSelectionFrom(
  resolved: ResolvedBookingRequest,
  input: { serviceId: string; displayName?: string },
): CanonicalSelection {
  const service = resolved.service;
  const serviceName =
    input.displayName?.trim() ||
    (resolved.variantName
      ? `${service.name} - ${resolved.variantName}`
      : service.name);

  const item: IAppointmentService = {
    serviceId: String(input.serviceId),
    serviceName: resolved.variantName ?? service.name,
    quantity: 1,
    // Iznos stavke = canonical procena. `null` (cena na upit) se ne sme
    // pretvoriti u 0 — „Termini bez cene" je legitimno stanje, lažna nula nije.
    price: resolved.pricing.total,
    duration: resolved.durationMinutes,
    ...(variantPartsOf(service, resolved.variantName)
      ? { variants: variantPartsOf(service, resolved.variantName) }
      : {}),
    ...(extraPartsOf(service, resolved.extras)
      ? { extras: extraPartsOf(service, resolved.extras) }
      : {}),
  };

  return {
    resolved,
    serviceName,
    durationMinutes: resolved.durationMinutes,
    item,
    pricing: buildPricingSnapshot(resolved.pricing),
    signature: selectionSignature({
      serviceId: String(input.serviceId),
      variantName: resolved.variantName,
      extras: resolved.extras,
    }),
  };
}

/**
 * Canonical izbor → ono što ide u bazu.
 *
 * Baca `BookingError` (kao i `resolveBookingRequest`) kad usluga ne postoji,
 * ne pripada salonu, ili kad deo izbora ne pripada usluzi.
 */
export async function resolveCanonicalSelection(input: {
  tenantId: string;
  serviceId: string;
  selection?: BookingSelectionInput;
  /** Naziv koji je površina već sastavila; bez njega se gradi iz kataloga. */
  displayName?: string;
}): Promise<CanonicalSelection> {
  const resolved = await resolveBookingRequest({
    tenantId: input.tenantId,
    serviceId: input.serviceId,
    selection: input.selection,
  });
  return canonicalSelectionFrom(resolved, input);
}
