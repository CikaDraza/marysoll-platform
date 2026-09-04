/**
 * Poravnanje računa termina — koliko je stiglo, koliko još treba.
 *
 * KLJUČNA GRANICA: ovde se NE računa cena. Cenu i popust već je izračunao
 * Appointment Checkout; ovde ulazi gotov `amountDue` i pita se samo kako se
 * novac koji je prošao kroz platformu odnosi prema njemu.
 *
 * Ledger prati SAMO novac koji je prošao kroz platformu. Ono što je salon
 * naplatio direktno (keš, uplata na svoj račun) tu se ne pojavljuje — razlika
 * `amountDue − captured` je upravo to.
 */

export interface AppointmentSettlement {
  /** Neto naplaćeno kroz platformu (naplate − povraćaji). */
  capturedMinor: number;
  /** Koliko još treba naplatiti; `null` kada ukupan iznos nije poznat. */
  remainingDueMinor: number | null;
  /** Kroz platformu je stiglo VIŠE nego što račun tvrdi da vredi. */
  overpaid: boolean;
  /** Ništa nije prošlo kroz platformu — račun se naplaćuje u celosti u salonu. */
  unpaid: boolean;
}

export interface LedgerAmount {
  /** Sa predznakom: naplata > 0, povraćaj/naknada < 0. */
  amountMinor: number;
}

/** Neto iznos koji je stvarno prošao kroz platformu. */
export function netCaptured(entries: readonly LedgerAmount[]): number {
  return entries.reduce((sum, entry) => sum + Math.trunc(entry.amountMinor), 0);
}

/**
 * Poravnanje računa.
 *
 * `amountDueMinor === null` znači da cena još nije poznata (termin „na upit"
 * bez potvrđene cene). Tada se ne tvrdi koliko još treba — samo koliko je
 * stiglo. `remainingDue` je `null`, ne nula: nula bi značila „sve je plaćeno".
 */
export function settleAppointment(input: {
  amountDueMinor: number | null;
  entries: readonly LedgerAmount[];
}): AppointmentSettlement {
  const capturedMinor = netCaptured(input.entries);

  if (input.amountDueMinor == null) {
    return {
      capturedMinor,
      remainingDueMinor: null,
      overpaid: false,
      unpaid: capturedMinor <= 0,
    };
  }

  const due = Math.trunc(input.amountDueMinor);
  return {
    capturedMinor,
    remainingDueMinor: Math.max(0, due - capturedMinor),
    overpaid: capturedMinor > due,
    unpaid: capturedMinor <= 0,
  };
}

/**
 * Tvrda provera: račun ne sme da tvrdi manju vrednost od novca koji je
 * stvarno stigao kroz platformu.
 *
 * Kršenje je integritetska greška, ne validacija forme — hvata slučaj kada je
 * vlasnica ukucala 2.000 a klijentkinja online platila 3.000, povraćaj koji
 * nije upisan, i depozit koji niko nije uračunao.
 *
 * `chargedMinor === null` uz postojeću naplatu je takođe kršenje: novac je
 * stigao, a termin tvrdi da nema vrednost.
 */
export function violatesChargedFloor(input: {
  chargedMinor: number | null;
  capturedMinor: number;
}): boolean {
  if (input.capturedMinor <= 0) return false;
  if (input.chargedMinor == null) return true;
  return input.chargedMinor < input.capturedMinor;
}
