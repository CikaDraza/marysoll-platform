import { formatServicePrice } from "@/helpers/formatPrice";
import { isFutureActiveAppointment } from "@/lib/statistics/engine";
import type { ClientOverview } from "@/types/client-overview";

type AppointmentItem = ClientOverview["appointments"]["items"][number];
type VoucherItem = NonNullable<ClientOverview["loyalty"]["vouchers"]>[number];

export function isClientInsightsVisible(available: boolean) {
  return available;
}

export function testimonialApprovalLabel(isApproved: boolean) {
  return isApproved ? "Odobrena" : "Čeka odobrenje";
}

const VOUCHER_STATUS_LABELS: Record<string, string> = {
  active: "Aktivan",
  reserved: "Rezervisan",
  redeemed: "Iskorišćen",
};

export function voucherStatusLabel(status: string) {
  return VOUCHER_STATUS_LABELS[status] ?? status;
}

export function voucherRewardLabel(voucher: Pick<VoucherItem, "type" | "value" | "serviceName">) {
  if (voucher.type === "percent") return `${voucher.value}% popusta`;
  if (voucher.type === "fixed") return `${formatServicePrice(voucher.value)} popusta`;
  return voucher.serviceName ? `Gratis: ${voucher.serviceName}` : "Gratis usluga";
}

export function splitClientAppointments(items: readonly AppointmentItem[], now = new Date()) {
  const next = items.filter((appointment) => isFutureActiveAppointment(appointment, now));
  const nextIds = new Set(next.map((appointment) => appointment.id));
  const previous = items.filter((appointment) => !nextIds.has(appointment.id));
  const key = (appointment: AppointmentItem) => `${appointment.date}T${appointment.time}`;
  return {
    next: [...next].sort((left, right) => key(left).localeCompare(key(right))),
    previous: [...previous].sort((left, right) => key(right).localeCompare(key(left))),
  };
}

/**
 * Da li se na termin uopšte sme dodati pogodnost (T1-4).
 *
 * Zatvoren termin je zatvoren: završen, propušten, otkazan ili odbijen termin
 * više ne prima nagradu. Ista lista važi na serveru — ovde je samo zato da
 * dugme ne obećava radnju koja bi vratila grešku.
 */
const BENEFIT_CLOSED_STATUSES = new Set([
  "completed",
  "no_show",
  "appointment_cancelled",
  "appointment_rejected",
]);

export function canApplyBenefitToAppointment(status: string): boolean {
  return !BENEFIT_CLOSED_STATUSES.has(status);
}
