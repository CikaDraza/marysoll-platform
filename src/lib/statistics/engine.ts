import {
  getAppointmentPotentialValue,
  getAppointmentRealizedValue,
  type PricedAppointment,
} from "@/lib/appointments/pricingSnapshot";

export interface StatisticsAppointment extends PricedAppointment {
  _id?: unknown;
  clientProfileId?: unknown;
  clientName?: string;
  clientEmail: string;
  serviceName?: string;
  services?: ReadonlyArray<{
    serviceId?: { name?: string } | string | null;
    price?: number | null;
    quantity?: number | null;
  }>;
  date: string;
  time: string;
  status?: string;
  createdAt?: Date | string;
}

export function statisticsPeriod(month: number, year: number) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

/** Canonical monetary value used by salon and Client 360 statistics. */
export function appointmentStatisticsValue(
  appointment: StatisticsAppointment,
): number | null {
  return appointment.status === "completed"
    ? getAppointmentRealizedValue(appointment)
    : getAppointmentPotentialValue(appointment);
}

export function clientIdentity(appointment: StatisticsAppointment): string {
  const profile = appointment.clientProfileId as
    | { _id?: unknown; toString?: () => string }
    | string
    | null
    | undefined;
  if (typeof profile === "string") return `id:${profile}`;
  if (profile?._id) return `id:${String(profile._id)}`;
  return `email:${appointment.clientEmail.trim().toLowerCase()}`;
}

export interface ClientPeriodInsights {
  potential: number;
  realized: number;
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  withoutPrice: number;
}

export function computeClientPeriodInsights(
  appointments: readonly StatisticsAppointment[],
): ClientPeriodInsights {
  const result: ClientPeriodInsights = {
    potential: 0,
    realized: 0,
    total: appointments.length,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    withoutPrice: 0,
  };

  for (const appointment of appointments) {
    const potential = getAppointmentPotentialValue(appointment);
    const realized = getAppointmentRealizedValue(appointment);
    if (potential == null) result.withoutPrice += 1;
    else result.potential += potential;
    if (realized != null) result.realized += realized;

    if (appointment.status === "completed") result.completed += 1;
    else if (
      appointment.status === "appointment_cancelled" ||
      appointment.status === "appointment_rejected"
    ) result.cancelled += 1;
    else if (appointment.status === "no_show") result.noShow += 1;
  }
  return result;
}

export function topClientsForPeriod(
  appointments: readonly StatisticsAppointment[],
  limit = 3,
) {
  const clients = new Map<string, { clientId: string | null; name: string; email: string; count: number }>();
  for (const appointment of appointments) {
    const key = clientIdentity(appointment);
    const current = clients.get(key);
    if (current) current.count += 1;
    else clients.set(key, {
      clientId: key.startsWith("id:") ? key.slice(3) : null,
      name: appointment.clientName ?? appointment.clientEmail,
      email: appointment.clientEmail,
      count: 1,
    });
  }
  return [...clients.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
