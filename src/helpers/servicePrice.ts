// helpers/servicePrice.ts
//
// JEDINO mesto koje tumači cenu usluge. Admin lista, javni cenovnik i
// BookingWidget su ranije imali tri različita tumačenja iste usluge; sada svi
// zovu ovde, pa se semantika menja na jednom mestu.
//
// Dve nezavisne ose:
//
//   type      single | variant | group   → struktura
//   priceMode fixed  | from    | on_request → način cene
//
// Cena po kombinaciji:
//
//   fixed  + single   → basePrice
//   fixed  + group    → basePrice (paket ima JEDNU cenu; `services[]` je spisak
//                       onoga što je uključeno, ne cenovnik)
//   fixed  + variant  → najniža PUNA cena varijante (`variants[].price`)
//   from   + bilo šta → basePrice korena je autoritativan minimum. NE računa se
//                       minimum iz `variants[]` — kod `from` varijanta nosi
//                       DOPLATU (`additionalPrice`), ne punu cenu.
//   on_request        → nema iznosa
//
// `variants[].price` uvek znači punu cenu i to se nikad ne menja — postojeće
// `variant + fixed` usluge zavise od toga.

import type { IService, IServiceVariant } from "@/types";

function knownPrices(
  parts: ReadonlyArray<{ price?: number | null; priceMode?: string }>,
): number[] {
  return parts
    .filter((p) => p.priceMode !== "on_request")
    .map((p) => p.price)
    .filter((p): p is number => typeof p === "number" && p > 0);
}

/** Najniža cena koju usluga može da ima, ili null kada se ne zna. */
export function minServicePrice(s: IService): number | null {
  if (s.priceMode === "on_request") return null;

  // "from": koren je autoritativan minimum. Varijante nose doplatu, pa bi
  // minimum iz `variants[]` bio besmislen broj.
  if (s.priceMode === "from") return s.basePrice ?? null;

  if (s.type === "variant") {
    const prices = knownPrices(s.variants ?? []);
    if (prices.length) return Math.min(...prices);
    // Sve varijante na upit, a koren nije "from" — nema šta da se prikaže.
    return s.basePrice ?? null;
  }

  // single i group: jedna cena na korenu.
  return s.basePrice ?? null;
}

/** true kada je prikazana cena donja granica, pa ispred nje ide "od". */
export function isPriceFrom(s: IService): boolean {
  if (s.priceMode === "from") return true;
  if (s.type !== "variant") return false;
  const prices = knownPrices(s.variants ?? []);
  if (!prices.length) return false;
  return Math.min(...prices) !== Math.max(...prices);
}

// ─── Procena za booking ───────────────────────────────────────────────────────

export interface PriceLine {
  label: string;
  /** null = iznos se ne zna (na upit) i ne ulazi u zbir. */
  amount: number | null;
  kind: "base" | "variant" | "extra";
}

export interface ServicePriceEstimate {
  /** Stavke procene, redom kojim se prikazuju klijentkinji. */
  lines: PriceLine[];
  /** Zbir SAMO poznatih iznosa. */
  total: number;
  /** true → zbir je donja granica, prikazuje se kao "od X". */
  isEstimate: boolean;
  /** true → nijedan deo nema poznat iznos; prikazuje se "Cena na upit". */
  unknown: boolean;
  durationMinutes: number;
}

function variantAdjustment(variant: IServiceVariant): number | null {
  if (variant.priceMode === "on_request") return null;
  return typeof variant.additionalPrice === "number"
    ? variant.additionalPrice
    : null;
}

/**
 * Procena cene i trajanja za konkretan izbor u BookingWidget-u.
 *
 * Formula je namerno različita po režimu:
 *
 *   fixed  → total = puna cena varijante (ili basePrice) + dodaci
 *   from   → total = basePrice + doplata varijante + poznati dodaci
 *
 * Kod `from` je rezultat uvek donja granica: znamo da neće biti MANJE od
 * toga, ali ne tvrdimo konačnu cenu. Nepoznata doplata ne ruši procenu —
 * stavka se prikaže kao "Cena na upit" i ne ulazi u zbir.
 */
export function estimateServicePrice(input: {
  service: IService;
  variantName?: string;
  extraNames?: readonly string[];
}): ServicePriceEstimate {
  const { service } = input;
  const lines: PriceLine[] = [];
  let duration = 0;

  const variant =
    service.type === "variant"
      ? service.variants?.find((v) => v.name === input.variantName)
      : undefined;

  if (service.priceMode === "from") {
    lines.push({
      kind: "base",
      label: "Osnovna cena",
      amount: service.basePrice ?? null,
    });
    duration += service.duration ?? 0;
    if (variant) {
      lines.push({
        kind: "variant",
        label: variant.name,
        amount: variantAdjustment(variant),
      });
      // Kod "from" je `duration` korena najkraće trajanje; varijanta ga
      // zamenjuje samo ako nosi svoje.
      if (variant.duration) duration = variant.duration;
    }
  } else if (service.type === "variant") {
    if (variant) {
      lines.push({
        kind: "variant",
        label: variant.name,
        amount: variant.priceMode === "on_request" ? null : variant.price,
      });
      duration += variant.duration ?? 0;
    }
  } else {
    // single i group: jedna cena i jedno trajanje na korenu.
    lines.push({
      kind: "base",
      label: service.name,
      amount: service.priceMode === "on_request" ? null : (service.basePrice ?? 0),
    });
    duration += service.duration ?? 0;
  }

  for (const name of input.extraNames ?? []) {
    const extra = service.extras?.find((e) => e.name === name);
    if (!extra) continue;
    lines.push({
      kind: "extra",
      label: extra.name,
      amount: extra.priceMode === "on_request" ? null : (extra.price ?? 0),
    });
    if (extra.duration) duration += extra.duration;
  }

  const known = lines.filter((l) => l.amount != null);
  const total = known.reduce((sum, l) => sum + (l.amount ?? 0), 0);

  return {
    lines,
    total,
    isEstimate:
      service.priceMode === "from" || lines.some((l) => l.amount == null),
    unknown: known.length === 0,
    durationMinutes: duration,
  };
}
