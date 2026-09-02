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
import type { IAppointmentPricing, IPricingLine } from "@/types";

/**
 * Strukturni minimum koji accessori stvarno čitaju.
 *
 * Namerno nije `IAppointment`: statistika i loyalty imaju svoje lokalne
 * oblike termina, a accessorima trebaju samo cena, količina i status.
 */
export interface PricedAppointment {
  pricing?: IAppointmentPricing | null;
  services?: ReadonlyArray<{
    price?: number | null;
    quantity?: number | null;
  }>;
  status?: string;
}
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
 * Prazan snapshot za zatečene termine bez njega — da salon i njima može da
 * upiše cenu, bez migracije istorije.
 */
export function emptyPricingSnapshot(
  currency = DEFAULT_CURRENCY,
): IAppointmentPricing {
  return {
    mode: "on_request",
    currency,
    baseAmount: null,
    minimumTotal: null,
    knownAddonsTotal: 0,
    quotedBaseAmount: null,
    quotedTotal: null,
    quotedAt: null,
    quotedBy: null,
    chargedAmount: null,
    chargedAt: null,
    chargedBy: null,
    lines: [],
  };
}

/**
 * Stvarno naplaćeno posle tretmana — UKUPAN iznos, ne osnovica.
 *
 * Snapshot rezervacije i quote ostaju netaknuti: oni beleže šta se znalo
 * ranije, a ovo je poslednja reč.
 */
export function applyChargedAmount(
  pricing: IAppointmentPricing,
  chargedAmount: number,
  by?: string | null,
): IAppointmentPricing {
  return {
    ...toPlainPricing(pricing),
    chargedAmount,
    chargedAt: new Date(),
    chargedBy: by ?? null,
  };
}

/**
 * Mongoose podokument u običan objekat.
 *
 * `appointment.pricing` iz `findOne()` bez `.lean()` je podokument čija polja
 * žive na prototipu, pa ih `{ ...pricing }` NE kopira: quote bi se računao nad
 * praznim objektom i `quotedTotal` bi ispao `NaN`. Zamka je tiha jer spread
 * ne baca.
 */
function toPlainPricing(pricing: IAppointmentPricing): IAppointmentPricing {
  const maybeDoc = pricing as unknown as { toObject?: () => IAppointmentPricing };
  return typeof maybeDoc.toObject === "function"
    ? maybeDoc.toObject()
    : pricing;
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
  const base = toPlainPricing(pricing);
  return {
    ...base,
    quotedBaseAmount,
    quotedTotal: quotedBaseAmount + base.knownAddonsTotal,
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
  appointment: PricedAppointment,
): number | null {
  const p = appointment.pricing;
  if (!p) return legacyNumericValue(appointment);
  if (p.mode === "on_request") return p.quotedTotal ?? null;
  return p.minimumTotal ?? null;
}

/** Iznos koji je salon potvrdio, ako jeste. */
export function getAppointmentQuotedValue(
  appointment: PricedAppointment,
): number | null {
  return appointment.pricing?.quotedTotal ?? null;
}

/**
 * Statusi koji dokazuju da je usluga stvarno izvršena.
 *
 * Bez ovog dokaza katalogška cena je samo očekivanje, ne prihod.
 */
const REALIZED_STATUSES = ["completed"] as const;

function isRealizedStatus(status: string | undefined): boolean {
  return REALIZED_STATUSES.includes(status as (typeof REALIZED_STATUSES)[number]);
}

/**
 * Stvarno realizovan prihod.
 *
 * Dva izvora, sa različitim pravilima:
 *
 *   1. `chargedAmount` — čovek je izričito upisao koliko je naplaćeno. Važi
 *      uvek, i na otkazanom terminu: ako je salon naplatio nadoknadu za kasno
 *      otkazivanje, to JESTE prihod. Eksplicitan unos se ne pogađa statusom.
 *
 *   2. katalogška cena kao fallback — ovo je ZAKLJUČAK, ne činjenica, pa traži
 *      dokaz da je usluga izvršena. Bez provere statusa bi `pending`,
 *      `cancelled` i `appointment_rejected` fiksni termin davali „prihod" od
 *      2.700 RSD samo zato što pozivalac nije filtrirao status.
 *
 * `from` i `on_request` bez naplaćenog iznosa nikad nisu prihod: minimum je
 * donja granica, a quote je procena.
 *
 * Refund semantika ne postoji — nema payment engine-a i ne izmišlja se ovde.
 */
export function getAppointmentRealizedValue(
  appointment: PricedAppointment,
): number | null {
  const charged = appointment.pricing?.chargedAmount;
  if (typeof charged === "number") return charged;

  if (!isRealizedStatus(appointment.status)) return null;

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
  appointment: PricedAppointment,
): number | null {
  const total = (appointment.services ?? []).reduce(
    (sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1),
    0,
  );
  return total > 0 ? total : null;
}
