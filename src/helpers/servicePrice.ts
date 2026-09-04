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

import type { IService, IServiceVariant, PriceMode } from "@/types";

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
  /** Količina dodatka (>1 se prikazuje kao "2 × Stiker"). */
  quantity?: number;
}

/** Izabran dodatak sa količinom. Dodatak bez `allowQuantity` uvek ima 1. */
export interface SelectedExtra {
  name: string;
  quantity: number;
}

export interface ServicePriceEstimate {
  /** Stavke procene, redom kojim se prikazuju klijentkinji. */
  lines: PriceLine[];
  /** Režim OSNOVNE cene — dodaci ga ne menjaju. */
  mode: PriceMode;
  /**
   * Zbir poznatih doplata i dodataka (bez osnovne cene).
   *
   * NIKAD nije cena termina sam za sebe. Kod `on_request` znamo samo ovaj
   * deo računa, pa se prikazuje kao stavka — ne kao ukupno.
   */
  knownAddonsTotal: number;
  /**
   * Cena termina, ili `null` kada se OSNOVNA cena ne zna.
   *
   * `UNKNOWN + 700 = UNKNOWN`. Nepoznata baza truje ceo zbir bez obzira
   * koliko poznatih dodataka stoji pored nje.
   */
  total: number | null;
  /** true → prikazani iznos je donja granica ("od X"), ne konačna cena. */
  isEstimate: boolean;
  /** true → cena termina se ne zna; `total` je `null`. */
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
  extras?: readonly SelectedExtra[];
}): ServicePriceEstimate {
  const { service } = input;
  const lines: PriceLine[] = [];
  let duration = 0;

  /** Osnovna cena. `null` = ne zna se, i tada nema ukupne cene termina. */
  let baseAmount: number | null = null;
  let mode: PriceMode = "fixed";
  /** Poznate doplate i dodaci — sve OSIM osnovne cene. */
  let knownAddonsTotal = 0;
  /** Neki poznat deo nedostaje → prikazani iznos je donja granica. */
  let hasUnknownPart = false;

  const variant =
    service.type === "variant"
      ? service.variants?.find((v) => v.name === input.variantName)
      : undefined;

  if (service.priceMode === "from") {
    mode = "from";
    baseAmount = service.basePrice ?? null;
    lines.push({ kind: "base", label: "Osnovna cena", amount: baseAmount });
    duration += service.duration ?? 0;

    if (variant) {
      const adjustment = variantAdjustment(variant);
      lines.push({ kind: "variant", label: variant.name, amount: adjustment });
      if (adjustment == null) hasUnknownPart = true;
      else knownAddonsTotal += adjustment;
      // Kod "from" je `duration` korena najkraće trajanje; varijanta ga
      // zamenjuje samo ako nosi svoje.
      if (variant.duration) duration = variant.duration;
    }
  } else if (service.type === "variant") {
    // Bez izabrane varijante osnovna cena još ne postoji — nije "na upit",
    // nego "nije izabrano", pa se ne prikazuje nikakav iznos.
    if (variant) {
      const known = variant.priceMode !== "on_request";
      baseAmount = known ? variant.price : null;
      if (!known) mode = "on_request";
      lines.push({ kind: "variant", label: variant.name, amount: baseAmount });
      duration += variant.duration ?? 0;
    }
  } else {
    // single i group: jedna cena i jedno trajanje na korenu.
    const known = service.priceMode !== "on_request";
    baseAmount = known ? (service.basePrice ?? 0) : null;
    if (!known) mode = "on_request";
    lines.push({ kind: "base", label: service.name, amount: baseAmount });
    duration += service.duration ?? 0;
  }

  for (const selected of input.extras ?? []) {
    const extra = service.extras?.find((e) => e.name === selected.name);
    if (!extra) continue;
    // Količina množi i cenu i trajanje: 3 × stiker je i 3 × cena i 3 × minuta.
    const quantity = extra.allowQuantity ? Math.max(1, selected.quantity) : 1;
    const amount =
      extra.priceMode === "on_request" ? null : (extra.price ?? 0) * quantity;
    lines.push({ kind: "extra", label: extra.name, amount, quantity });
    if (amount == null) hasUnknownPart = true;
    else knownAddonsTotal += amount;
    if (extra.duration) duration += extra.duration * quantity;
  }

  // Osnovna cena je nepoznata → nema ukupne cene, ma koliko dodataka znali.
  const total = baseAmount == null ? null : baseAmount + knownAddonsTotal;
  const unknown = total == null;

  return {
    lines,
    mode,
    knownAddonsTotal,
    total,
    // "od X" kad je baza minimum ili kad neki poznat deo nedostaje.
    isEstimate: !unknown && (mode === "from" || hasUnknownPart),
    unknown,
    durationMinutes: duration,
  };
}
