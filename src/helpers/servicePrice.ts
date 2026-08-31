// helpers/servicePrice.ts
//
// Jedno mesto koje odgovara na pitanje "koja cena se prikazuje za ovu uslugu".
// Ranije je svaka tema nosila svoju kopiju `minPrice`, pa je promena semantike
// značila 12 identičnih izmena — i 12 prilika da se jedna zaboravi.
//
// Cena po tipu usluge:
//   single → `basePrice`
//   group  → `basePrice` (paket ima JEDNU cenu; `services[]` je spisak onoga
//            što je uključeno, ne cenovnik)
//   variant → najniža cena varijante, jer se bira jedna od alternativa
//
// Varijante bez poznate cene (`on_request`) se preskaču. Ako nijedna varijanta
// nema cenu, pada se na `basePrice` korena — tu vlasnik može da drži donju
// granicu ("od 2.000 RSD") za uslugu čija konačna cena zavisi od zahteva.

import type { IService } from "@/types";

function knownPrices(
  parts: ReadonlyArray<{ price?: number | null; priceMode?: string }>,
): number[] {
  // "from" nosi poznatu donju granicu, pa se računa kao poznata cena.
  return parts
    .filter((p) => p.priceMode !== "on_request")
    .map((p) => p.price)
    .filter((p): p is number => typeof p === "number" && p > 0);
}

/** Najniža poznata cena usluge, ili null kada nijedna nije poznata. */
export function minServicePrice(s: IService): number | null {
  if (s.priceMode === "on_request") return null;

  if (s.type === "variant") {
    const prices = knownPrices(s.variants ?? []);
    if (prices.length) return Math.min(...prices);
    // Sve varijante su na upit — koren nosi donju granicu, ako je vlasnik uneo.
    return s.basePrice ?? null;
  }

  if (s.basePrice != null && s.basePrice > 0) return s.basePrice;

  // Zatečeni paketi upisani po starom modelu (cena po stavci, bez cene na
  // korenu) — dok ih vlasnik ne prepiše, prikaži zbir stavki umesto ničega.
  if (s.type === "group") {
    const prices = knownPrices(s.services ?? []);
    if (prices.length) return prices.reduce((a, b) => a + b, 0);
  }

  return s.basePrice ?? null;
}

/**
 * true kada je prikazana cena donja granica, pa ispred nje ide "od".
 *
 * Dva razloga: vlasnik je uslugu označio kao `from` (zna najmanju cenu, ne i
 * konačnu), ili usluga ima više varijanti sa različitim cenama.
 */
export function isPriceFrom(s: IService): boolean {
  if (s.priceMode === "from") return true;
  if (s.type !== "variant") return false;
  const prices = knownPrices(s.variants ?? []);
  // Sve varijante na upit → cena dolazi sa korena, koji nije "from".
  if (!prices.length) return false;
  return Math.min(...prices) !== Math.max(...prices);
}
