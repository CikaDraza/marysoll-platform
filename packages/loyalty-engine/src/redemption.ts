/**
 * Redemption — čista pravila trošenja loyalty vrednosti (T1-4).
 *
 * Tri odluke koje se u aplikaciji ponavljaju na četiri mesta (booking create,
 * naknadna primena vaučera, points-shop kupovina, recompute posle promene
 * cene ili usluge) i zato NE smeju da žive u rutama:
 *
 *   1. da li vaučer uopšte važi za izabranu uslugu (`serviceScope`);
 *   2. koliko iznosi popust nad poznatom osnovicom;
 *   3. da li klijentkinja može da priušti points-shop ponudu.
 *
 * Bez baze i bez mongoose-a: id-jevi su `IdLike`, iznosi obični brojevi.
 *
 * KLJUČNO PRAVILO: `null` osnovica nije nula. Termin „na upit" bez potvrđene
 * cene nema ni popust ni konačan iznos — sve troje ostaje `null` dok salon ne
 * potvrdi cenu. `basis ?? 0` bi vaučer od 20% pretvorio u „popust 0 RSD" i
 * tiho ga potrošio ni na šta.
 */
import type { IdLike, VoucherDiscountInput, DiscountService } from "./pricing";
import { computeVoucherDiscount } from "./pricing";

/** Ponuda iz points-shop kataloga sa STABILNIM identitetom. */
export interface PointsShopOfferInput {
  /** Stabilan id ponude — nikad indeks u nizu. */
  id: string;
  costPoints: number;
  reward: {
    type: "percent" | "fixed" | "free_service";
    value: number;
    serviceId?: IdLike | null;
    serviceName?: string;
    expiresDays?: number;
  };
}

/**
 * Da li vaučer važi za uslugu termina.
 *
 * Prazan `serviceScope` znači „sve usluge". Ovo je ODVOJENA provera od
 * obračuna popusta: `computeVoucherDiscount` za tip `fixed` namerno skida
 * iznos sa ukupnog računa bez obzira na scope, pa bi bez ove kapije
 * vaučer „500 RSD na tretman lica" prošao i na manikiru.
 */
export function isVoucherApplicableToService(
  voucher: Pick<VoucherDiscountInput, "serviceScope">,
  serviceId: IdLike | null | undefined,
): boolean {
  const scope = (voucher.serviceScope ?? []).map(String);
  if (scope.length === 0) return true;
  if (!serviceId) return false;
  return scope.includes(String(serviceId));
}

export interface BenefitPricing {
  /** Cena pre pogodnosti; `null` = osnovica još nije poznata. */
  originalPrice: number | null;
  discountAmount: number | null;
  finalPrice: number | null;
}

/** Nijedan iznos nije poznat — vaučer čeka osnovicu. */
export const UNKNOWN_BENEFIT_PRICING: BenefitPricing = {
  originalPrice: null,
  discountAmount: null,
  finalPrice: null,
};

/**
 * Obračun pogodnosti nad JEDNOM poznatom osnovicom termina.
 *
 * `basis` je ukupna cena pre pogodnosti (quote ako postoji, inače canonical
 * minimum). `null` ulazi kao `null` izlazi — vaučer ostaje rezervisan i čeka.
 * Popust nikad ne pravi negativan iznos.
 */
export function computeBenefitPricing(input: {
  basis: number | null;
  serviceId?: IdLike | null;
  voucher: VoucherDiscountInput | null;
}): BenefitPricing {
  if (input.basis == null) return UNKNOWN_BENEFIT_PRICING;
  const basis = Math.max(0, Math.round(input.basis));
  if (!input.voucher) {
    return { originalPrice: basis, discountAmount: 0, finalPrice: basis };
  }
  if (!isVoucherApplicableToService(input.voucher, input.serviceId)) {
    return { originalPrice: basis, discountAmount: 0, finalPrice: basis };
  }
  const services: DiscountService[] = [
    { serviceId: input.serviceId ?? undefined, price: basis, quantity: 1 },
  ];
  const discountAmount = Math.min(
    basis,
    Math.max(0, computeVoucherDiscount(input.voucher, services)),
  );
  return {
    originalPrice: basis,
    discountAmount,
    finalPrice: Math.max(0, basis - discountAmount),
  };
}

export interface PointsShopEligibility {
  affordable: boolean;
  applicable: boolean;
  eligible: boolean;
  missingPoints: number;
}

/**
 * Može li klijentkinja da kupi ovu ponudu za OVAJ termin.
 *
 * Prikaz sme da ponudi i nedostupnu stavku (da se vidi cilj), ali server
 * dozvoljava kupovinu samo kad je `eligible`.
 */
export function evaluatePointsShopOffer(input: {
  offer: PointsShopOfferInput;
  pointsBalance: number;
  serviceId?: IdLike | null;
}): PointsShopEligibility {
  const cost = Math.max(0, Math.trunc(input.offer.costPoints));
  const balance = Math.trunc(input.pointsBalance);
  const affordable = cost > 0 && balance >= cost;
  const scope = input.offer.reward.serviceId
    ? [input.offer.reward.serviceId]
    : [];
  const applicable = isVoucherApplicableToService(
    { serviceScope: scope },
    input.serviceId,
  );
  return {
    affordable,
    applicable,
    eligible: affordable && applicable,
    missingPoints: Math.max(0, cost - balance),
  };
}

/**
 * Deterministički idempotency ključ points-shop kupovine.
 *
 * Vezan za termin i STABILAN id ponude — retry istog zahteva ne sme drugi put
 * da skine poene. Indeks u nizu bi ovde bio katastrofa: promena redosleda
 * ponuda učinila bi ključ nestabilnim.
 */
export function pointsShopIdempotencyKey(
  appointmentId: IdLike,
  offerId: string,
): string {
  return `points-shop:${String(appointmentId)}:${offerId}`;
}
