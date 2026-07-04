import type { IAppointment } from "@/types";

const DEFAULT_CANCELLATION_WINDOW_HOURS = 1;

function normalizeCancellationWindowHours(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) {
    return DEFAULT_CANCELLATION_WINDOW_HOURS;
  }
  return numeric;
}

function getCancellationDeadline(
  appointment: Pick<IAppointment, "createdAt" | "cancellationWindowHours">,
): Date {
  const createdAt = appointment.createdAt
    ? new Date(appointment.createdAt)
    : new Date();
  const hours = normalizeCancellationWindowHours(
    appointment.cancellationWindowHours,
  );
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function canClientCancelAppointment(
  appointment: Pick<IAppointment, "createdAt" | "cancellationWindowHours">,
  now = new Date(),
): boolean {
  return now.getTime() <= getCancellationDeadline(appointment).getTime();
}

function getAppointmentStart(appointment: Pick<IAppointment, "date" | "time">): Date {
  return new Date(`${appointment.date}T${appointment.time}`);
}

export function hasAppointmentStarted(
  appointment: Pick<IAppointment, "date" | "time">,
  now = new Date(),
): boolean {
  return now.getTime() >= getAppointmentStart(appointment).getTime();
}
