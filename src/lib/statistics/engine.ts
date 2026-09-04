import {
  getAppointmentPotentialValue,
  getAppointmentRealizedValue,
  type PricedAppointment,
} from "@/lib/appointments/pricingSnapshot";
import { blocksSlot } from "@/lib/appointments/occupancy";
import type { StatisticsResponse } from "@/types/statistics";

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
function appointmentStatisticsValue(
  appointment: StatisticsAppointment,
): number | null {
  return appointment.status === "completed"
    ? getAppointmentRealizedValue(appointment)
    : getAppointmentPotentialValue(appointment);
}

function clientIdentity(appointment: StatisticsAppointment): string {
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

export interface DatedAppointment extends PricedAppointment {
  date: string;
  time: string;
}

function appointmentDateTimeKey(appointment: Pick<DatedAppointment, "date" | "time">) {
  return `${appointment.date}T${appointment.time}`;
}

function currentDateTimeKey(now: Date) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function isFutureActiveAppointment(
  appointment: DatedAppointment,
  now = new Date(),
) {
  return blocksSlot(appointment.status) &&
    appointmentDateTimeKey(appointment) >= currentDateTimeKey(now);
}

export function futureActivePotential(
  appointments: readonly StatisticsAppointment[],
  now = new Date(),
) {
  return appointments.reduce((sum, appointment) => {
    if (!isFutureActiveAppointment(appointment, now)) return sum;
    return sum + (getAppointmentPotentialValue(appointment) ?? 0);
  }, 0);
}

export function relationshipRealizedRevenue(
  appointments: readonly StatisticsAppointment[],
) {
  return appointments.reduce(
    (sum, appointment) => sum + (getAppointmentRealizedValue(appointment) ?? 0),
    0,
  );
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
  return rankTopClients([...clients.values()], limit);
}

export interface RankedClientPeriod {
  clientId: string | null;
  name: string;
  email: string;
  count: number;
}

/** Shared Top-N ordering for raw salon rows and aggregated Client 360 rows. */
export function rankTopClients(
  clients: readonly RankedClientPeriod[],
  limit = 3,
) {
  return [...clients].sort((left, right) => right.count - left.count).slice(0, limit);
}

interface SalonStatisticsInput {
  appointments: readonly StatisticsAppointment[];
  month: number;
  year: number;
  totalClients: number;
  registeredThisMonth: number;
  firstEverByEmail: ReadonlyArray<{ email: string; firstCreatedAt: Date }>;
}

interface StatisticsAccumulator {
  serviceDistribution: Record<string, number>;
  revenueByService: Record<string, number>;
  servicesWithoutPrice: Record<string, number>;
  completedRevenue: number;
  cancelledRevenue: number;
  noShowRevenue: number;
  completedCount: number;
  cancelledCount: number;
  withoutPriceCount: number;
}

function createAccumulator(): StatisticsAccumulator {
  return {
    serviceDistribution: {}, revenueByService: {}, servicesWithoutPrice: {},
    completedRevenue: 0, cancelledRevenue: 0, noShowRevenue: 0,
    completedCount: 0, cancelledCount: 0, withoutPriceCount: 0,
  };
}

function accumulateOutcome(result: StatisticsAccumulator, appointment: StatisticsAppointment, value: number | null) {
  if (value == null) result.withoutPriceCount += 1;
  if (appointment.status === "completed") {
    result.completedRevenue += value ?? 0;
    result.completedCount += 1;
    return;
  }
  if (appointment.status === "appointment_cancelled" || appointment.status === "appointment_rejected") {
    result.cancelledRevenue += value ?? 0;
    result.cancelledCount += 1;
    return;
  }
  if (appointment.status === "no_show") result.noShowRevenue += value ?? 0;
}

function serviceNameOf(service: NonNullable<StatisticsAppointment["services"]>[number], appointment: StatisticsAppointment) {
  const document = typeof service.serviceId === "object" ? service.serviceId : null;
  return document?.name || appointment.serviceName || "Nepoznato";
}

function accumulateServices(result: StatisticsAccumulator, appointment: StatisticsAppointment, value: number | null) {
  for (const service of appointment.services ?? []) {
    const name = serviceNameOf(service, appointment);
    result.serviceDistribution[name] = (result.serviceDistribution[name] ?? 0) + 1;
    const target = value == null ? result.servicesWithoutPrice : result.revenueByService;
    target[name] = (target[name] ?? 0) + (value ?? 1);
  }
}

function averageAppointmentGap(appointments: readonly StatisticsAppointment[]) {
  const timestamps = appointments.map(({ date, time }) => new Date(`${date} ${time}`).getTime()).sort((left, right) => left - right);
  const validGaps = timestamps.slice(1).map((timestamp, index) => (timestamp - timestamps[index]) / 60_000).filter((gap) => gap > 0 && gap < 480);
  return validGaps.length ? Math.round(validGaps.reduce((sum, gap) => sum + gap, 0) / validGaps.length) : 0;
}

function serviceBreakdown(result: StatisticsAccumulator) {
  return Object.entries(result.serviceDistribution).map(([name, count]) => {
    const withoutPrice = result.servicesWithoutPrice[name] ?? 0;
    const revenue = result.revenueByService[name];
    return { name, count, revenue: revenue == null && withoutPrice > 0 ? null : (revenue ?? 0), withoutPrice };
  });
}

function countNewClients(activeEmails: ReadonlySet<string>, firstEverByEmail: SalonStatisticsInput["firstEverByEmail"], start: Date, end: Date) {
  return firstEverByEmail.filter(({ email, firstCreatedAt }) =>
    activeEmails.has(email.trim().toLowerCase()) && firstCreatedAt >= start && firstCreatedAt < end,
  ).length;
}

export function computeSalonStatistics({
  appointments,
  month,
  year,
  totalClients,
  registeredThisMonth,
  firstEverByEmail,
}: SalonStatisticsInput): StatisticsResponse {
  const { start, end } = statisticsPeriod(month, year);
  const result = createAccumulator();
  for (const appointment of appointments) {
    const value = appointmentStatisticsValue(appointment);
    accumulateOutcome(result, appointment, value);
    accumulateServices(result, appointment, value);
  }
  const totalRevenue = Object.values(result.revenueByService).reduce((sum, value) => sum + value, 0);
  const activeEmails = new Set(appointments.map((appointment) => appointment.clientEmail.trim().toLowerCase()));
  const newClients = countNewClients(activeEmails, firstEverByEmail, start, end);

  return {
    month: String(month),
    year: String(year),
    pieChart: result.serviceDistribution,
    revenueByService: result.revenueByService,
    serviceBreakdown: serviceBreakdown(result),
    topClients: topClientsForPeriod(appointments),
    topServices: Object.entries(result.serviceDistribution).sort((left, right) => right[1] - left[1]).slice(0, 5).map(([service, count]) => ({ service, count })),
    totalAppointments: appointments.length,
    totalRevenue,
    revenue: { potential: totalRevenue, completed: result.completedRevenue, cancelled: result.cancelledRevenue, noShow: result.noShowRevenue, completedCount: result.completedCount, cancelledCount: result.cancelledCount, withoutPriceCount: result.withoutPriceCount },
    avgTimeGap: averageAppointmentGap(appointments),
    clients: {
      total: totalClients,
      active: activeEmails.size,
      inactive: Math.max(0, totalClients - activeEmails.size),
      new: newClients,
      returning: Math.max(0, activeEmails.size - newClients),
      registeredThisMonth,
    },
  };
}
