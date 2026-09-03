import "server-only";

/**
 * Stabilan identitet points-shop ponude.
 *
 * Ponuda je jedini autoritet cene i nagrade u redemption toku, pa mora da ima
 * id koji preživi izmenu cene i promenu redosleda. Indeks u nizu to nije:
 * vlasnica koja prevuče drugu nagradu na prvo mesto promenila bi značenje
 * svakog zahteva koji je u tom trenutku u letu.
 *
 * Pravilo dodele: id koji stiže iz forme prihvata se SAMO ako već postoji u
 * sačuvanoj konfiguraciji tog salona. Sve ostalo dobija nov, server-generisan
 * id — browser ne sme da bira identitet, ni slučajno ni namerno.
 */
import crypto from "crypto";
import type { RewardSpec } from "./types";

export interface PointsShopItemInput {
  id?: string | null;
  costPoints: number;
  reward: RewardSpec;
}

export interface PointsShopItem extends PointsShopItemInput {
  id: string;
}

export function newPointsShopOfferId(): string {
  return `psh_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/**
 * Dodeli/očuvaj id-jeve pri snimanju konfiguracije.
 *
 * Idempotentno: drugi prolaz nad istim ulazom ne menja nijedan id.
 */
export function assignPointsShopIds(
  incoming: readonly PointsShopItemInput[],
  existing: readonly { id?: string | null }[] = [],
): PointsShopItem[] {
  const knownIds = new Set(
    existing.map((item) => item.id).filter((id): id is string => Boolean(id)),
  );
  const used = new Set<string>();
  return incoming.map((item) => {
    const candidate = item.id?.trim();
    const keep =
      candidate && knownIds.has(candidate) && !used.has(candidate)
        ? candidate
        : newPointsShopOfferId();
    used.add(keep);
    return { ...item, id: keep };
  });
}
