import "server-only";

/**
 * Deljeni tokovi za KLIJENTSKO otkazivanje i izmenu termina.
 * Koriste ih po dve rute (isti korisnik, različit ulaz/auth):
 *   - /api/appointments/client/[id]/cancel|update   (tenant JWT)
 *   - /api/marketplace/appointments/[id]/cancel|update (HMAC + clientEmail,
 *     poziva booking.marysoll.com boost app)
 *
 * Pre konsolidacije kopije su se već razišle:
 *   - marketplace cancel NIJE zvao loyalty hook (vaučer/no-show politika)
 *   - marketplace update NIJE imao proveru preklapanja po trajanju ni
 *     manualSlots proveru pri pomeranju termina
 * Ovaj modul je sada jedina istina za oba toka.
 */
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { canClientCancelAppointment } from "@/lib/appointments/cancellation";
import { loadBookingProfile } from "@/lib/appointments/booking";
import { createAppointmentNotification } from "@/lib/notificationService";
import { loyaltyOnAppointmentStatusChange } from "@/lib/loyalty/hooks";
import {
  checkManualSlotAvailability,
  overlapsAppointments,
} from "@/helpers/manualSlots";
import type { IAppointmentService } from "@/types";
import type { PreferredContact } from "@/lib/contactRules";

/** Statusi u kojima klijent više ne može ništa da menja. */
const FINAL_STATUSES = ["appointment_cancelled", "completed", "no_show"];

/* Mongoose Appointment model nije generički tipovan, pa dokument opisujemo
   strukturno — samo polja koja tokovi čitaju/menjaju. */
interface AppointmentDoc {
  _id: { toString(): string };
  tenantId: string;
  clientProfileId?: { toString(): string } | string | null;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientInstagram?: string;
  preferredContact?: PreferredContact;
  contactNote?: string;
  serviceName: string;
  services: IAppointmentService[];
  date: string;
  time: string;
  duration: number;
  note?: string;
  status: string;
  createdAt?: string | Date;
  cancellationWindowHours?: number;
  cancellationStatus?: string;
  cancellationType?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  noShowMarkedAt?: Date;
  noShowReason?: string;
  lastUpdatedBy?: string;
  save(): Promise<unknown>;
}

function notificationPayload(appointment: AppointmentDoc) {
  return {
    _id: appointment._id.toString(),
    tenantId: appointment.tenantId,
    clientProfileId: appointment.clientProfileId?.toString() ?? "",
    clientName: appointment.clientName,
    clientEmail: appointment.clientEmail,
    serviceName: appointment.serviceName,
    date: appointment.date,
    time: appointment.time,
    note: appointment.note,
    clientPhone: appointment.clientPhone,
    clientInstagram: appointment.clientInstagram,
    preferredContact: appointment.preferredContact,
    contactNote: appointment.contactNote,
  };
}

// ─── Otkazivanje ──────────────────────────────────────────────────────────────

export type ClientCancelResult =
  | { ok: false; error: string }
  | { ok: true; canCancel: boolean; message: string };

/**
 * U roku → appointment_cancelled (legitimno) + notifikacija adminu.
 * Van roka → no_show / late_cancel, bez notifikacije.
 * Loyalty hook (oslobađanje vaučera, no-show politika) se zove uvek — nikad ne baca.
 */
export async function cancelAppointmentAsClient(
  appointment: AppointmentDoc,
): Promise<ClientCancelResult> {
  if (FINAL_STATUSES.includes(appointment.status)) {
    return { ok: false, error: "Termin se više ne može otkazati." };
  }

  const now = new Date();
  const canCancel = canClientCancelAppointment(appointment, now);
  const previousStatus = appointment.status;

  appointment.lastUpdatedBy = "client";
  appointment.cancelledAt = now;
  appointment.cancelledBy = "client";

  if (canCancel) {
    appointment.status = "appointment_cancelled";
    appointment.cancellationType = "legitimate";
    appointment.cancellationStatus = "can_cancel";
  } else {
    appointment.status = "no_show";
    appointment.cancellationType = "late";
    appointment.cancellationStatus = "late_cancel";
    appointment.noShowMarkedAt = now;
    appointment.noShowReason = "late_cancel";
  }

  await appointment.save();

  // Growth Studio: oslobađanje vaučera / no-show politika (nikad ne baca)
  await loyaltyOnAppointmentStatusChange(
    appointment._id.toString(),
    previousStatus,
    appointment.status,
  );

  if (canCancel) {
    await createAppointmentNotification(notificationPayload(appointment), "cancelled", {
      sender: "client",
      message: "Klijent je otkazao termin u dozvoljenom roku.",
    });
  }

  return {
    ok: true,
    canCancel,
    message: canCancel
      ? "Termin je otkazan."
      : "Vreme za otkazivanje termina je isteklo.",
  };
}

// ─── Izmena / pomeranje ───────────────────────────────────────────────────────

export interface RescheduleInput {
  date: string;
  time: string;
  services: IAppointmentService[];
  serviceName?: string;
  note?: string;
  duration?: number;
}

export type ClientRescheduleResult =
  | {
      ok: false;
      kind: "expired" | "final" | "service_not_found" | "conflict" | "unavailable";
      error: string;
    }
  | { ok: true };

/**
 * Guard rok-za-izmenu → status/final guard → usluga → exact konflikt →
 * (pri promeni vremena/trajanja) preklapanje po trajanju + manualSlots →
 * mutacija + notifikacija "rescheduled" ako je datum/vreme promenjeno.
 */
export async function rescheduleAppointmentAsClient(
  appointment: AppointmentDoc,
  input: RescheduleInput,
  opts?: { expiredMessage?: string },
): Promise<ClientRescheduleResult> {
  if (!canClientCancelAppointment(appointment)) {
    appointment.cancellationStatus = "late_cancel";
    await appointment.save();
    return {
      ok: false,
      kind: "expired",
      error: opts?.expiredMessage ?? "Vreme za izmenu termina je isteklo.",
    };
  }

  if (FINAL_STATUSES.includes(appointment.status)) {
    return { ok: false, kind: "final", error: "Termin se više ne može izmeniti." };
  }

  const serviceId = input.services[0]?.serviceId;
  const service = await Service.findById(serviceId);
  if (!service) {
    return { ok: false, kind: "service_not_found", error: "Usluga nije pronađena." };
  }

  const tenantId = appointment.tenantId;

  // Exact-match konflikt (istorijsko ponašanje obe rute — hvata i slučaj
  // nepromenjenog vremena).
  const conflict = await Appointment.findOne({
    _id: { $ne: appointment._id },
    tenantId,
    date: input.date,
    time: input.time,
    status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
  });
  if (conflict) {
    return { ok: false, kind: "conflict", error: "Termin je zauzet." };
  }

  // Provere se rade samo kad se menja datum/vreme/trajanje — izmena
  // usluge/napomene mora proći i kada zatečeno stanje (npr. admin upis)
  // ne bi prošlo validaciju.
  const newDuration =
    Number(input.duration) || service.duration || appointment.duration;
  const dateOrTimeChanged =
    input.date !== appointment.date || input.time !== appointment.time;
  const timingChanged = dateOrTimeChanged || newDuration !== appointment.duration;

  if (timingChanged) {
    const dayAppointments = await Appointment.find({
      _id: { $ne: appointment._id },
      tenantId,
      date: input.date,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    })
      .select("date time duration")
      .lean<{ date: string; time: string; duration?: number }[]>();

    // Preklapanje po TRAJANJU (oba režima): [time, time+duration) ne sme da se
    // seče ni sa jednim tuđim aktivnim terminom tog dana.
    if (overlapsAppointments(dayAppointments, input.date, input.time, newDuration)) {
      return { ok: false, kind: "conflict", error: "Termin je zauzet." };
    }

    // manualSlots režim: i pomeranje termina sme samo na tačan termin koji je
    // vlasnik definisao. Nepromenjeno vreme se ne proverava — da izmena prođe
    // i kada je vlasnik u međuvremenu uklonio definiciju tog slota.
    if (dateOrTimeChanged) {
      const { profile } = await loadBookingProfile(tenantId);
      if (profile?.availabilityMode === "manualSlots") {
        const check = checkManualSlotAvailability(
          profile.manualSlots,
          dayAppointments,
          input.date,
          input.time,
        );
        if (!check.ok) {
          return check.reason === "taken"
            ? { ok: false, kind: "conflict", error: "Termin je zauzet." }
            : {
                ok: false,
                kind: "unavailable",
                error:
                  "Izabrani termin nije dostupan. Izaberite jedan od ponuđenih termina.",
              };
        }
      }
    }
  }

  const dateChanged = input.date !== appointment.date;
  const timeChanged = input.time !== appointment.time;

  appointment.date = input.date;
  appointment.time = input.time;
  appointment.serviceName = input.serviceName || service.name;
  appointment.note = input.note || undefined;
  appointment.duration = newDuration;
  appointment.services = input.services.map((s) => ({
    ...s,
    serviceName: s.serviceName,
    duration: s.duration,
  }));
  appointment.lastUpdatedBy = "client";
  if (dateChanged || timeChanged) {
    appointment.status = "appointment_rescheduled";
  }

  await appointment.save();

  if (dateChanged || timeChanged) {
    await createAppointmentNotification(notificationPayload(appointment), "rescheduled", {
      sender: "client",
      message: "Klijent je izmenio termin u dozvoljenom roku.",
    });
  }

  return { ok: true };
}
