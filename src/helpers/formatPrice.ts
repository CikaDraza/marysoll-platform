// src/helpers/price.ts
import type { PriceMode } from "@/types";

export const PRICE_ON_REQUEST_LABEL = "Cena na upit";

/**
 * Format number to "1.234,56" (thousand separator '.' and decimal ',' with two decimals)
 * Assumes input is integer or number (RSD without decimals usually), returns string with 2 decimals.
 */
export function formatPriceToString(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  const n = Number(value);
  // ensure two decimals
  const parts = n.toFixed(2).split(".");
  const intPart = parts[0];
  const decPart = parts[1];
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + decPart;
}

export function formatServicePrice(
  value: number | null | undefined,
  priceMode?: PriceMode | null,
  suffix = "RSD",
): string {
  if (priceMode === "on_request") return PRICE_ON_REQUEST_LABEL;
  const formatted = formatPriceToString(value);
  return formatted ? `${formatted}${suffix ? ` ${suffix}` : ""}` : "";
}

export function isPriceOnRequest(priceMode?: PriceMode | null): boolean {
  return priceMode === "on_request";
}

