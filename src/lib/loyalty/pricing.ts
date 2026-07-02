// ─── Growth Studio: čist obračun popusta (bez server-only — unit testabilno) ──
// Popust se UVEK računa server-side iz podataka termina; klijentov prikaz cene
// je samo informativan.

import type { Types } from "mongoose";

export interface VoucherDiscountInput {
  type: "percent" | "fixed" | "free_service";
  value: number;
  serviceScope?: Array<Types.ObjectId | string> | null;
  serviceName?: string;
}

export interface DiscountService {
  serviceId?: Types.ObjectId | string;
  price?: number;
  quantity?: number;
}

/** Izračun popusta vaučera za skup usluga termina. Nikad ne prelazi ukupno. */
export function computeVoucherDiscount(
  voucher: VoucherDiscountInput,
  services: DiscountService[],
): number {
  const total = services.reduce(
    (sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1),
    0,
  );
  if (total <= 0) return 0;

  const scope = (voucher.serviceScope ?? []).map(String);
  const inScope = (s: DiscountService) =>
    scope.length === 0 || (s.serviceId && scope.includes(String(s.serviceId)));

  if (voucher.type === "percent") {
    const scopedTotal = services
      .filter(inScope)
      .reduce(
        (sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1),
        0,
      );
    return Math.min(Math.round((scopedTotal * voucher.value) / 100), total);
  }
  if (voucher.type === "fixed") {
    return Math.min(Math.round(voucher.value), total);
  }
  // free_service: popust = cena prve usluge u scope-u (jedan komad)
  const target = services.find(inScope);
  return target ? Math.min(Number(target.price) || 0, total) : 0;
}
