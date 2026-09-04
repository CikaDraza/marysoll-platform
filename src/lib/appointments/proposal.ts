import "server-only";

/**
 * Životni ciklus PREDLOGA novog termina (salon predlaže → klijentkinja bira).
 *
 * Dva pravila drže ceo tok:
 *
 *   1. Predlog NE rezerviše slot. Dok klijentkinja ne prihvati, predloženo
 *      vreme je i dalje slobodno za sve ostale — inače bi salon slanjem
 *      predloga sam sebi blokirao termin koji možda niko neće uzeti.
 *
 *   2. Zato se dostupnost proverava U TRENUTKU PRIHVATANJA, ne slanja.
 *      Između predloga i prihvatanja mogu proći dani; termin u međuvremenu
 *      može biti popunjen. Ranije provere nije bilo nigde — prihvatanje je
 *      slepo prepisivalo `date`/`time` i pravilo dvostruko zakazivanje.
 *
 * Termin koji se pomera je izuzet iz provere (`excludeAppointmentId`) — svoje
 * staro vreme nije prepreka svom novom.
 */
import { checkSlotAvailability, loadBookingProfile } from "@/lib/appointments/booking";
import { isClientActionableStatus } from "@/lib/appointments/cancellation";

interface ProposalDoc {
  _id: { toString(): string };
  tenantId: string | { toString(): string };
  status: string;
  duration: number;
  proposedDate?: string | null;
  proposedTime?: string | null;
}

export type ProposalDecision = "accept" | "reject";

export type ProposalResult =
  | { ok: false; kind: "no_proposal" | "final" | "conflict"; error: string }
  | { ok: true; kind: "accepted"; date: string; time: string }
  | { ok: true; kind: "rejected" };

/**
 * Odluka klijentkinje o predlogu. NE upisuje — vraća ishod, a ruta ga pretvara
 * u jedan atomic `findOneAndUpdate` zajedno sa ostatkom izmene.
 */
export async function evaluateProposalDecision(
  appointment: ProposalDoc,
  decision: ProposalDecision,
): Promise<ProposalResult> {
  const date = appointment.proposedDate ?? null;
  const time = appointment.proposedTime ?? null;

  if (!date || !time) {
    return {
      ok: false,
      kind: "no_proposal",
      error: "Za ovaj termin ne postoji predlog salona.",
    };
  }

  // Završen/otkazan termin nema šta da prihvata.
  if (!isClientActionableStatus(appointment.status)) {
    return {
      ok: false,
      kind: "final",
      error: "Termin se više ne može menjati.",
    };
  }

  if (decision === "reject") return { ok: true, kind: "rejected" };

  const tenantId = String(appointment.tenantId);
  const { profile } = await loadBookingProfile(tenantId);

  // Radno vreme se NE nameće: predlog je dao sam salon i sme svesno da izađe
  // iz njega (ista sloboda kao kod admin zakazivanja, odluka 2026-07-04).
  // Proverava se ono što salon nije mogao da predvidi — da je slot popunjen.
  const conflict = await checkSlotAvailability({
    tenantId,
    date,
    time,
    requestedDuration: appointment.duration,
    profile,
    enforceWorkingHours: false,
    excludeAppointmentId: appointment._id,
  });

  if (conflict) {
    return {
      ok: false,
      kind: "conflict",
      error:
        "Predloženi termin je u međuvremenu popunjen. Salon će Vam poslati novi predlog.",
    };
  }

  return { ok: true, kind: "accepted", date, time };
}

/**
 * Polja kojima se predlog BRIŠE iz termina.
 *
 * `{ proposedDate: undefined }` ovde ne radi: Mongoose izbacuje `undefined`
 * ključeve iz update-a, pa je predlog ostajao u bazi i posle odluke —
 * klijentkinja je zauvek gledala „Prihvati / Odbij" za termin koji je već
 * prihvatila. Zato eksplicitan `$unset`.
 */
export const CLEAR_PROPOSAL_UNSET = {
  proposedDate: "",
  proposedTime: "",
} as const;

/** Ima li termin predlog koji čeka odluku klijentkinje. */
export function hasPendingProposal(appointment: {
  proposedDate?: string | null;
  proposedTime?: string | null;
}): boolean {
  return Boolean(appointment.proposedDate && appointment.proposedTime);
}
