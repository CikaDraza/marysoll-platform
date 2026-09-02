import type {
  IAppointment,
  IAppointmentAttachment,
  IAppointmentRequest,
  IService,
} from "@/types";
import type { SelectedExtra } from "@/helpers/servicePrice";

export interface BookingWidgetDefaults {
  date: string;
  time: string;
  serviceId: string;
  variantName: string;
  extras: SelectedExtra[];
  note: string;
  intakeNote: string;
  intakeReferenceUrl: string;
  intakeImage: IAppointmentAttachment | null;
}

/** Pretvara postojeći termin u početno stanje istog widgeta koji ga kreira. */
export function bookingDefaultsFromAppointment(
  appointment: IAppointment | null | undefined,
  services: IService[],
): BookingWidgetDefaults | null {
  if (!appointment) return null;
  const item = appointment.services?.[0];
  const service = services.find((candidate) => candidate._id === item?.serviceId);
  const variantName =
    item?.variants?.[0]?.name ??
    (service?.type === "variant" ? item?.serviceName ?? "" : "");

  return {
    date: appointment.date,
    time: appointment.time,
    serviceId: item?.serviceId ?? "",
    variantName,
    extras: (item?.extras ?? []).map((extra) => ({
      name: extra.name,
      quantity: extra.quantity ?? 1,
    })),
    note: appointment.note ?? "",
    intakeNote: appointment.request?.note ?? "",
    intakeReferenceUrl: appointment.request?.referenceUrl ?? "",
    intakeImage: appointment.request?.attachments?.[0] ?? null,
  };
}

/** Presentation UI nikada ne pokušava da čita persistence `bookingIntake`. */
export function bookingPresentationRequiresIntake(
  service: Pick<IService, "intakeEnabled"> | null | undefined,
): boolean {
  return service?.intakeEnabled === true;
}

/** Date/time-only edit mora da izostavi request komandu i sačuva zapis 1:1. */
export function bookingIntakeChanged(
  original: IAppointmentRequest | undefined,
  current: {
    note: string;
    referenceUrl: string;
    image: IAppointmentAttachment | null;
  },
): boolean {
  const attachment = original?.attachments?.[0] ?? null;
  return (
    (original?.note ?? "") !== current.note.trim() ||
    (original?.referenceUrl ?? "") !== current.referenceUrl.trim() ||
    (attachment?.publicId ?? "") !== (current.image?.publicId ?? "") ||
    (attachment?.url ?? "") !== (current.image?.url ?? "")
  );
}
