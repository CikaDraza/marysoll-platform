import "server-only";

/**
 * Canonical server-side razrešavanje booking zahteva.
 *
 * Do sada je browser slao `duration` i `price`, a server ih je prihvatao kao
 * poslovnu činjenicu. Klijent koji pošalje `{ price: 1, duration: 5 }` dobijao
 * je termin od pet minuta za jedan dinar.
 *
 * Ovo je jedini seam kroz koji svi tokovi (BookingModal create/edit,
 * AdminCreateModal, marketplace) dobijaju istu istinu:
 *
 *     tenantId + serviceId + selection
 *              ↓
 *     canonical Service iz baze, TENANT-SCOPED
 *              ↓
 *     resolveServiceBookingProduct   → selection + duration
 *     estimateServicePrice           → pricing
 *              ↓
 *     checkSlotAvailability(canonical duration)
 *
 * Pricing NIJE ovde iznova izračunat — koristi se isti `estimateServicePrice`
 * koji vidi i klijent, da prikaz i upis ne bi mogli da se raziđu.
 *
 * `ref` nikad nije autoritet: usluga se učitava po (tenant, serviceId), pa se
 * tek onda proverava da svaki prosleđeni ref pripada TOJ usluzi. Globalnog
 * lookup-a po ref-u nema.
 */
import { Types } from "mongoose";
import { Service } from "@/models/Service";
import { BookingError } from "./errors";
import {
  resolveServiceBookingProduct,
  type ServiceProductSelection,
} from "./serviceAdapter";
import {
  estimateServicePrice,
  type ServicePriceEstimate,
  type SelectedExtra,
} from "@/helpers/servicePrice";
import {
  resolveServiceBookingIntake,
  type ResolvedServiceIntake,
} from "@/lib/appointments/serviceIntake";
import type { IService } from "@/types";

/**
 * Izbor koji stiže sa bilo koje površine.
 *
 * `*Ref` polja su canonical. Imena su prelazni most za zatečene klijente koji
 * još ne šalju ref (BookingModal danas); prevode se u ref preko canonical
 * usluge, pa i oni prolaze kroz istu validaciju.
 */
export interface BookingSelectionInput {
  variantRef?: string;
  itemRefs?: ReadonlyArray<{ ref: string; quantity?: number }>;
  extraRefs?: ReadonlyArray<{ ref: string; quantity?: number }>;
  /** @deprecated prelazno — koristi `variantRef`. */
  variantName?: string;
  /** @deprecated prelazno — koristi `extraRefs`. */
  extras?: ReadonlyArray<{ name: string; quantity?: number }>;
}

export interface ResolvedBookingRequest {
  service: IService;
  /** Da li usluga traži zahtev klijentkinje — rešeno na jednom mestu. */
  intake: ResolvedServiceIntake;
  /** Trajanje iz kataloga — nikad iz zahteva. */
  durationMinutes: number;
  /** Cena iz kataloga — nikad iz zahteva. */
  pricing: ServicePriceEstimate;
  /** Ime izabrane varijante, za `serviceName` termina. */
  variantName: string | null;
  /** Izabrani dodaci sa canonical imenima i količinama. */
  extras: SelectedExtra[];
}

interface NamedPart {
  _id?: unknown;
  name?: string;
}

/** Ref → canonical ime, uz proveru da deo pripada OVOJ usluzi. */
function nameForRef(
  parts: ReadonlyArray<NamedPart> | undefined,
  ref: string,
  what: string,
): string {
  const part = parts?.find((p) => String(p._id ?? "") === ref);
  if (!part) {
    throw new BookingError(
      "BOOKING_PRODUCT_NOT_AVAILABLE",
      `${what} ne pripada izabranoj usluzi.`,
    );
  }
  return String(part.name ?? "");
}

/** Ime → ref, za zatečene klijente koji još ne šalju ref. */
function refForName(
  parts: ReadonlyArray<NamedPart> | undefined,
  name: string,
): string | null {
  const part = parts?.find((p) => String(p.name ?? "") === name);
  return part ? String(part._id ?? "") : null;
}

function positiveQuantity(value: number | undefined): number {
  const quantity = value ?? 1;
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
}

export async function resolveBookingRequest(input: {
  tenantId: string;
  serviceId: string;
  selection?: BookingSelectionInput;
}): Promise<ResolvedBookingRequest> {
  if (!Types.ObjectId.isValid(input.serviceId)) {
    throw new BookingError("BOOKING_PRODUCT_NOT_AVAILABLE", "Usluga ne postoji.");
  }

  // Tenant scope je jedina kapija: usluga iz drugog salona se ovde ne nađe,
  // pa nijedan njen ref ne može biti razrešen.
  const service = await Service.findOne({
    _id: input.serviceId,
    tenantId: input.tenantId,
  }).lean<IService & { variants?: NamedPart[]; extras?: NamedPart[]; services?: NamedPart[] }>();

  if (!service) {
    throw new BookingError(
      "BOOKING_PRODUCT_NOT_AVAILABLE",
      "Usluga ne postoji ili ne pripada salonu.",
    );
  }

  const selection = input.selection ?? {};

  // ── varijanta ──
  let variantName: string | null = null;
  let variantRef: string | undefined;
  if (service.type === "variant") {
    if (selection.variantRef) {
      variantName = nameForRef(service.variants, selection.variantRef, "Varijanta");
      variantRef = selection.variantRef;
    } else if (selection.variantName) {
      const ref = refForName(service.variants, selection.variantName);
      if (!ref) {
        throw new BookingError(
          "BOOKING_PRODUCT_NOT_AVAILABLE",
          "Varijanta ne pripada izabranoj usluzi.",
        );
      }
      variantName = selection.variantName;
      variantRef = ref;
    }
  }

  // ── dodaci ──
  const extras: SelectedExtra[] = [];
  const extraRefs: { ref: string; quantity: number }[] = [];
  for (const item of selection.extraRefs ?? []) {
    const name = nameForRef(service.extras, item.ref, "Dodatak");
    const quantity = positiveQuantity(item.quantity);
    extras.push({ name, quantity });
    extraRefs.push({ ref: item.ref, quantity });
  }
  for (const item of selection.extras ?? []) {
    if (extras.some((e) => e.name === item.name)) continue;
    const ref = refForName(service.extras, item.name);
    if (!ref) {
      throw new BookingError(
        "BOOKING_PRODUCT_NOT_AVAILABLE",
        "Dodatak ne pripada izabranoj usluzi.",
      );
    }
    const quantity = positiveQuantity(item.quantity);
    extras.push({ name: item.name, quantity });
    extraRefs.push({ ref, quantity });
  }

  // ── stavke paketa ──
  const itemRefs: { ref: string; quantity: number }[] = [];
  for (const item of selection.itemRefs ?? []) {
    nameForRef(service.services, item.ref, "Stavka paketa");
    itemRefs.push({ ref: item.ref, quantity: positiveQuantity(item.quantity) });
  }

  const engineSelection: ServiceProductSelection = {
    ...(variantRef ? { variantRef } : {}),
    ...(itemRefs.length ? { itemRefs } : {}),
    ...(extraRefs.length ? { extraRefs } : {}),
  };

  // Trajanje dolazi iz engine-a nad canonical uslugom — nikad iz zahteva.
  const product = await resolveServiceBookingProduct({
    tenantId: input.tenantId,
    serviceId: input.serviceId,
    selection: engineSelection,
    service: service as never,
  });

  const pricing = estimateServicePrice({
    service: service as IService,
    ...(variantName ? { variantName } : {}),
    extras,
  });

  return {
    service: service as IService,
    intake: resolveServiceBookingIntake(service as IService),
    durationMinutes: product.snapshot.durationMinutes,
    pricing,
    variantName,
    extras,
  };
}
