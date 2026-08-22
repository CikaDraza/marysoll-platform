import { minutesToTime, zonedParts } from "@panta/booking-engine";
import type {
  BookingAvailabilityProvider,
  BookingDomainTransactionAdapter,
  BookingProductSnapshot,
} from "./contracts";
import { BookingError } from "./errors";
import {
  buildAvailabilityQuery,
  type BookedAppointment,
  type SalonAvailabilityProfile,
} from "./availabilityAdapter";
import { loadUnmigratedAppointmentOccupancy } from "./legacyOccupancy";
import { Appointment } from "@/models/Appointment";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";

interface ServicePart {
  _id: { toString(): string };
  name: string;
  duration: number;
}

interface ServiceRecord {
  _id: { toString(): string };
  tenantId: { toString(): string };
  name: string;
  type: "single" | "group" | "variant";
  duration?: number;
  services?: ServicePart[];
  variants?: ServicePart[];
  extras?: ServicePart[];
  updatedAt?: Date;
}

export interface ServiceProductSelection {
  itemRefs?: ReadonlyArray<{ ref: string; quantity: number }>;
  variantRef?: string;
  quantity?: number;
  extraRefs?: ReadonlyArray<{ ref: string; quantity: number }>;
}

export interface ResolvedServiceBookingProduct {
  productType: "service";
  productRef: string;
  resourceKey: "salon";
  snapshot: BookingProductSnapshot;
}

function positiveQuantity(value: number | undefined): number {
  const quantity = value ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new BookingError("BOOKING_PRODUCT_NOT_AVAILABLE", "Nevalidna količina usluge");
  }
  return quantity;
}

function selectedPart(
  parts: ServicePart[] | undefined,
  ref: string,
): ServicePart {
  const part = parts?.find((candidate) => candidate._id.toString() === ref);
  if (!part || !Number.isFinite(part.duration) || part.duration <= 0) {
    throw new BookingError("BOOKING_PRODUCT_NOT_AVAILABLE", "Izbor usluge nije dostupan");
  }
  return part;
}

function resolveSelection(
  service: ServiceRecord,
  selection: ServiceProductSelection,
): NonNullable<BookingProductSnapshot["selection"]> {
  const resolved: Array<{
    ref: string;
    name: string;
    quantity: number;
    durationMinutes: number;
  }> = [];
  if (service.type === "group") {
    if (!selection.itemRefs?.length) {
      throw new BookingError("BOOKING_PRODUCT_NOT_AVAILABLE", "Izaberite stavke grupne usluge");
    }
    for (const item of selection.itemRefs) {
      const part = selectedPart(service.services, item.ref);
      resolved.push({
        ref: item.ref,
        name: part.name,
        quantity: positiveQuantity(item.quantity),
        durationMinutes: part.duration,
      });
    }
  } else if (service.type === "variant") {
    if (!selection.variantRef) {
      throw new BookingError("BOOKING_PRODUCT_NOT_AVAILABLE", "Izaberite varijantu usluge");
    }
    const variant = selectedPart(service.variants, selection.variantRef);
    resolved.push({
      ref: selection.variantRef,
      name: variant.name,
      quantity: positiveQuantity(selection.quantity),
      durationMinutes: variant.duration,
    });
  }
  for (const extra of selection.extraRefs ?? []) {
    const part = selectedPart(service.extras, extra.ref);
    resolved.push({
      ref: extra.ref,
      name: part.name,
      quantity: positiveQuantity(extra.quantity),
      durationMinutes: part.duration,
    });
  }
  return resolved;
}

export async function resolveServiceBookingProduct(input: {
  tenantId: string;
  serviceId: string;
  selection?: ServiceProductSelection;
}): Promise<ResolvedServiceBookingProduct> {
  const service = await Service.findOne({
    _id: input.serviceId,
    tenantId: input.tenantId,
  }).lean<ServiceRecord>();
  if (!service) {
    throw new BookingError(
      "BOOKING_PRODUCT_NOT_AVAILABLE",
      "Usluga ne postoji ili ne pripada tenant-u",
    );
  }
  const selection = resolveSelection(service, input.selection ?? {});
  const selectedDuration = selection.reduce(
    (sum, item) => sum + item.durationMinutes * item.quantity,
    0,
  );
  const durationMinutes =
    service.type === "single"
      ? (service.duration ?? 0) + selectedDuration
      : selectedDuration;
  if (!Number.isFinite(durationMinutes) || !durationMinutes || durationMinutes <= 0) {
    throw new BookingError("BOOKING_PRODUCT_NOT_AVAILABLE", "Usluga nema validno trajanje");
  }
  return {
    productType: "service",
    productRef: service._id.toString(),
    resourceKey: "salon",
    snapshot: {
      name: service.name,
      durationMinutes,
      ...(selection.length ? { selection } : {}),
      ...(service.updatedAt ? { revision: service.updatedAt.toISOString() } : {}),
    },
  };
}

interface ServiceAppointmentItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  duration: number;
  price?: number;
}

export interface ServiceAppointmentDraft {
  clientRef: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientInstagram?: string;
  preferredContact?: "phone" | "instagram" | "email" | "platform";
  contactNote?: string;
  serviceName: string;
  services: ServiceAppointmentItem[];
  note?: string;
  cancellationWindowHours?: number;
  lastUpdatedBy?: "client" | "admin";
}

function appointmentDateTime(instant: Date, timezone: string): { date: string; time: string } {
  const parts = zonedParts(instant, timezone);
  return { date: parts.date, time: minutesToTime(parts.minutes) };
}

export function createServiceAppointmentDomainAdapter(input: {
  tenantId: string;
  draft?: ServiceAppointmentDraft;
}): BookingDomainTransactionAdapter {
  return {
    async applyReserve({ session, reservationId, command }) {
      if (!input.draft || input.draft.clientRef !== command.clientRef) {
        throw new BookingError("BOOKING_PERMISSION_DENIED", "Appointment client scope nije validan");
      }
      if (command.domainRef.type !== "appointment") {
        throw new BookingError("BOOKING_PRODUCT_NOT_AVAILABLE", "Service booking zahteva Appointment");
      }
      const local = appointmentDateTime(command.startsAt, command.timezone);
      await Appointment.create(
        [
          {
            _id: command.domainRef.id,
            tenantId: input.tenantId,
            bookingReservationId: reservationId,
            clientProfileId: input.draft.clientRef,
            clientName: input.draft.clientName,
            clientEmail: input.draft.clientEmail,
            clientPhone: input.draft.clientPhone ?? "",
            clientInstagram: input.draft.clientInstagram ?? "",
            preferredContact: input.draft.preferredContact,
            contactNote: input.draft.contactNote ?? "",
            serviceName: input.draft.serviceName,
            services: input.draft.services,
            date: local.date,
            time: local.time,
            duration: command.productSnapshot.durationMinutes,
            note: input.draft.note,
            cancellationWindowHours: input.draft.cancellationWindowHours ?? 1,
            cancellationStatus: "can_cancel",
            status: "pending",
            messages: [],
            adminNotified: false,
            clientNotified: false,
            lastUpdatedBy: input.draft.lastUpdatedBy,
            unreadCount: { client: 0, admin: 0 },
          },
        ],
        { session },
      );
    },
    async applyReschedule({ session, reservationId, startsAt, timezone }) {
      const local = appointmentDateTime(startsAt, timezone);
      const result = await Appointment.updateOne(
        { tenantId: input.tenantId, bookingReservationId: reservationId },
        {
          $set: {
            date: local.date,
            time: local.time,
            status: "appointment_rescheduled",
          },
        },
        { session },
      );
      if (result.matchedCount !== 1) {
        throw new BookingError("BOOKING_RESERVATION_NOT_FOUND", "Povezani Appointment ne postoji");
      }
    },
    async applyLifecycle({ session, reservationId, operation, occurredAt, late }) {
      const status =
        operation === "cancel"
          ? late
            ? "no_show"
            : "appointment_cancelled"
          : operation === "reject"
            ? "appointment_rejected"
            : operation === "complete"
              ? "completed"
              : "no_show";
      const result = await Appointment.updateOne(
        { tenantId: input.tenantId, bookingReservationId: reservationId },
        {
          $set: {
            status,
            ...(operation === "cancel" ? { cancelledAt: occurredAt } : {}),
            ...(operation === "complete" ? { completedAt: occurredAt } : {}),
            ...(operation === "mark_no_show" ? { noShowMarkedAt: occurredAt } : {}),
          },
        },
        { session },
      );
      if (result.matchedCount !== 1) {
        throw new BookingError("BOOKING_RESERVATION_NOT_FOUND", "Povezani Appointment ne postoji");
      }
    },
  };
}

interface AvailabilityProfileRecord extends SalonAvailabilityProfile {
  timezone?: string;
}

export const serviceAvailabilityProvider: BookingAvailabilityProvider = {
  async load(input) {
    if (input.resourceKey !== "salon") {
      throw new BookingError(
        "BOOKING_RESOURCE_NOT_AVAILABLE",
        "Service v1 podržava samo salon resource",
      );
    }
    const profile = await SalonProfile.findOne({ tenantId: input.tenantId })
      .session(input.session)
      .select("workingHours vacations availabilityMode manualSlots timezone")
      .lean<AvailabilityProfileRecord>();
    if (!profile) {
      throw new BookingError("BOOKING_RESOURCE_NOT_AVAILABLE", "Salon profil nije pronađen");
    }
    const appointments: BookedAppointment[] =
      await loadUnmigratedAppointmentOccupancy({
        tenantId: input.tenantId,
        localDate: input.localDate,
        session: input.session,
      });
    return {
      query: buildAvailabilityQuery({
        tenantId: input.tenantId,
        resourceKey: input.resourceKey,
        localDate: input.localDate,
        durationMinutes: input.durationMinutes,
        profile,
        appointments,
        ...(profile.timezone ? { timezone: profile.timezone } : {}),
      }),
    };
  },
};
