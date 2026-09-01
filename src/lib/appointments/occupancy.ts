/**
 * Koji statusi termina zauzimaju slot.
 *
 * Pravilo je bilo prepisano na sedam mesta kao
 * `$nin: ["appointment_rejected", "appointment_cancelled"]`, pa je `no_show`
 * OSTAJAO blokirajući. Posledica: klijentkinja kasno otkaže u 13:30 za termin
 * u 14:00, termin pređe u `no_show` + `late_cancel`, a salon taj slot više ne
 * može da proda — sistem ga i dalje smatra zauzetim.
 *
 * Termin se NIKAD ne briše: istorija je potrebna statistici, loyalty-ju,
 * brojaču nedolazaka i budućem Restriction Engine-u. Ali završen termin ne
 * drži vreme.
 *
 *   pending / approved / rescheduled  → blokira
 *   rejected / cancelled              → ne blokira
 *   no_show (uklj. late_cancel)       → ne blokira
 *   completed                         → ne blokira (istorija, ne rezervacija)
 */
export const NON_BLOCKING_APPOINTMENT_STATUSES = [
  "appointment_rejected",
  "appointment_cancelled",
  "no_show",
  "completed",
] as const;

/** Mongo filter za termine koji stvarno drže vreme. */
export const ACTIVE_APPOINTMENT_STATUS_FILTER = {
  $nin: [...NON_BLOCKING_APPOINTMENT_STATUSES],
} as const;

/** Da li termin sa ovim statusom zauzima slot. */
export function blocksSlot(status: string | undefined): boolean {
  return !NON_BLOCKING_APPOINTMENT_STATUSES.includes(
    status as (typeof NON_BLOCKING_APPOINTMENT_STATUSES)[number],
  );
}
