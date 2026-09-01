/**
 * Canonical cena termina — od procene do stvarno naplaćenog iznosa.
 *
 * Četiri različite činjenice, i nijedna ne sme da se pravi da je druga:
 *
 *   katalog          Service.basePrice / variants[].price
 *   snapshot         šta se znalo U TRENUTKU rezervacije   ← ovde
 *   quote            salon potvrdio cenu (npr. po fotografiji)
 *   charged          stvarno naplaćeno posle tretmana
 *
 * Ključno pravilo brojeva:
 *   0    = poznata cena od nula dinara
 *   null = cena nije poznata / nije potvrđena
 *
 * `price || 0` je zabranjen obrazac — nula bi postala poslovna činjenica i
 * termin na upit izgledao kao besplatan u statistici i loyalty-ju.
 */
import type {
  IAppointmentPricing,
  IPricingLine,
  IAppointment,
} from "@/types";
import type { ServicePriceEstimate } from "@/helpers/servicePrice";

export const DEFAULT_CURRENCY = "RSD";

/** Snapshot iz canonical procene. Server ga pravi, browser nikad. */
export function buildPricingSnapshot(
  estimate: ServicePriceEstimate,
  currency = DEFAULT_CURRENCY,
): IAppointmentPricing {
  const lines: IPricingLine[] = estimate.lines.map((line) => ({
    kind: line.kind,
    label: line.label,
    amount: line.amount,
    ...(line.quantity != null ? { quantity: line.quantity } : {}),
  }));

  return {
    mode: estimate.mode,
    currency,
    // Osnovna cena je zbir bez poznatih doplata; `null` kad se ne zna.
    baseAmount:
      estimate.total == null ? null : estimate.total - estimate.knownAddonsTotal,
    minimumTotal: estimate.total,
    knownAddonsTotal: estimate.knownAddonsTotal,
    quotedBaseAmount: null,
    quotedTotal: null,
    quotedAt: null,
    quotedBy: null,
    chargedAmount: null,
    chargedAt: null,
    chargedBy: null,
    lines,
  };
}

/**
 * Quote: salon unosi OSNOVNU cenu, server izvodi ukupno.
 * Browser ne sme da pošalje `quotedTotal` — inače bi mogao da tvrdi bilo šta.
 */
export function applyQuote(
  pricing: IAppointmentPricing,
  quotedBaseAmount: number,
  by?: string | null,
): IAppointmentPricing {
  return {
    ...pricing,
    quotedBaseAmount,
    quotedTotal: quotedBaseAmount + pricing.knownAddonsTotal,
    quotedAt: new Date(),
    quotedBy: by ?? null,
  };
}

// ─── Centralni accessori za analitiku ─────────────────────────────────────────
//
// Potrošači NIKAD ne čitaju cenu direktno: `potential`, `quoted` i `realized`
// su tri različite činjenice i mešanje im daje netačan prihod.

/**
 * Vrednost koju termin MOŽE doneti.
 *
 *   fixed       tačan ukupan iznos
 *   from        minimum (donja granica, ne prihod)
 *   on_request  quote ako postoji, inače `null` — nikad zbir poznatih dodataka
 */
export function getAppointmentPotentialValue(
  appointment: Pick<IAppointment, "pricing" | "services">,
): number | null {
  const p = appointment.pricing;
  if (!p) return legacyNumericValue(appointment);
  if (p.mode === "on_request") return p.quotedTotal ?? null;
  return p.minimumTotal ?? null;
}

/** Iznos koji je salon potvrdio, ako jeste. */
export function getAppointmentQuotedValue(
  appointment: Pick<IAppointment, "pricing">,
): number | null {
  return appointment.pricing?.quotedTotal ?? null;
}

/**
 * Stvarno realizovan prihod.
 *
 * Samo `chargedAmount` je realizacija. Minimum, quote i poznati dodaci NISU
 * prihod samo zato što termin postoji.
 *
 * Legacy izuzetak: zatečeni `fixed` termini bez snapshot-a nemaju
 * `chargedAmount`, pa se njihova numerička cena i dalje računa — inače bi
 * istorijski prihod starih salona pao na nulu preko noći.
 */
export function getAppointmentRealizedValue(
  appointment: Pick<IAppointment, "pricing" | "services" | "status">,
): number | null {
  const charged = appointment.pricing?.chargedAmount;
  if (typeof charged === "number") return charged;

  // Termin sa canonical snapshot-om, a bez naplaćenog iznosa: prihod je
  // poznat samo ako je cena bila fiksna od početka.
  if (appointment.pricing) {
    return appointment.pricing.mode === "fixed"
      ? (appointment.pricing.minimumTotal ?? null)
      : null;
  }

  return legacyNumericValue(appointment);
}

/**
 * Zatečeni termini bez snapshot-a.
 *
 * Nula se NE tretira kao prihod: stari termini za usluge na upit upisivali su
 * `price: 0` jer cena nije bila poznata, a ne zato što je usluga besplatna.
 * Razlika se ne može dokazati iz samog termina, pa se 0 vraća kao `null`.
 */
function legacyNumericValue(
  appointment: Pick<IAppointment, "services">,
): number | null {
  const total = (appointment.services ?? []).reduce(
    (sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1),
    0,
  );
  return total > 0 ? total : null;
}
