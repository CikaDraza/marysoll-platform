import "server-only";

import type {
  IAppointmentPriceProposal,
  IAppointmentPricing,
} from "@/types";
import { hasAppointmentStarted } from "@/lib/appointments/cancellation";
import { applyQuote } from "@/lib/appointments/pricingSnapshot";

interface PriceProposalDoc {
  status: string;
  date: string;
  time: string;
  pricing?: IAppointmentPricing | null;
  priceProposal?: IAppointmentPriceProposal | null;
}

export type PriceProposalDecision = "accept" | "reject";

export type PriceProposalResult =
  | {
      ok: false;
      kind: "no_proposal" | "final" | "started" | "stale";
      error: string;
    }
  | { ok: true; kind: "accepted"; pricing: IAppointmentPricing }
  | { ok: true; kind: "rejected" };

/** Server izvodi ukupan iznos; browser šalje samo osnovnu cenu. */
export function createPriceProposal(
  pricing: IAppointmentPricing,
  quotedBaseAmount: number,
  proposedBy?: string | null,
  now: Date = new Date(),
): IAppointmentPriceProposal {
  const quote = applyQuote(pricing, quotedBaseAmount, proposedBy);
  return {
    quotedBaseAmount,
    quotedTotal: quote.quotedTotal ?? quotedBaseAmount,
    currency: quote.currency,
    proposedAt: now,
    proposedBy: proposedBy ?? null,
  };
}

/**
 * Odluka samo planira atomic update koji izvršava API ruta. Prihvatanje
 * promoviše tačno viđeni predlog u canonical pricing; odbijanje zatvara termin.
 */
export function evaluatePriceProposalDecision(
  appointment: PriceProposalDoc,
  decision: PriceProposalDecision,
  now: Date = new Date(),
): PriceProposalResult {
  const proposal = appointment.priceProposal;
  if (!proposal) {
    return {
      ok: false,
      kind: "no_proposal",
      error: "Za ovaj termin ne postoji predlog cene salona.",
    };
  }

  if (!["pending", "appointment_rescheduled"].includes(appointment.status)) {
    return {
      ok: false,
      kind: "final",
      error: "O ceni ovog termina više nije moguće odlučiti.",
    };
  }

  if (hasAppointmentStarted(appointment, now)) {
    return {
      ok: false,
      kind: "started",
      error: "Predlog cene se potvrđuje pre početka termina.",
    };
  }

  if (decision === "reject") return { ok: true, kind: "rejected" };

  const pricing = appointment.pricing;
  if (!pricing) {
    return {
      ok: false,
      kind: "stale",
      error: "Podaci o ceni su promenjeni. Salon treba da pošalje novi predlog.",
    };
  }

  const acceptedPricing = applyQuote(
    pricing,
    proposal.quotedBaseAmount,
    proposal.proposedBy ?? null,
  );
  if (acceptedPricing.quotedTotal !== proposal.quotedTotal) {
    return {
      ok: false,
      kind: "stale",
      error: "Sastav usluge je promenjen. Salon treba da pošalje novi predlog cene.",
    };
  }

  return { ok: true, kind: "accepted", pricing: acceptedPricing };
}

export const CLEAR_PRICE_PROPOSAL_UNSET = { priceProposal: "" } as const;
