/**
 * lib/platform/blocks/deps.ts — request-scoped izvor podataka za loadere.
 *
 * Spec 5.2: N blokova ≠ N upita. Svaki resurs se povlači najviše jednom po
 * zahtevu; paralelni pozivaoci dele isti promise (dedupe, ne samo keš).
 *
 * U T2A `ClientHomePage` već povuče salon/services/testimonials u jednom
 * server prolazu, pa se koristi `preloadedBlockDataSource` — nula novih upita,
 * nula rizika po LCP. Kada blokovi dobiju stvarnu autonomiju, isti kontrakt
 * puni `createBlockDataSource` sa pravim upitima.
 */

import type { IService, LandingStructure, SalonProfileData } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import type { BlockDataSource } from "./types";

/** Memoizacija promise-a: drugi pozivalac dobija prvi promise, ne novi posao. */
function once<T>(fn: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    if (!pending) pending = fn();
    return pending;
  };
}

export interface BlockDataFetchers {
  landingStructure: () => Promise<LandingStructure | undefined>;
  salon: () => Promise<SalonProfileData>;
  services: () => Promise<IService[]>;
  testimonials: () => Promise<PublicTestimonial[]>;
  tenantStats: () => Promise<TenantStats | undefined>;
}

/**
 * Napravi izvor podataka od stvarnih upita. Svaki `fetcher` se poziva najviše
 * jednom po instanci — instanca živi koliko i jedan zahtev.
 */
export function createBlockDataSource(
  fetchers: BlockDataFetchers,
): BlockDataSource {
  return {
    landingStructure: once(fetchers.landingStructure),
    salon: once(fetchers.salon),
    services: once(fetchers.services),
    testimonials: once(fetchers.testimonials),
    tenantStats: once(fetchers.tenantStats),
  };
}

export interface PreloadedTenantSnapshot {
  salon: SalonProfileData;
  services: IService[];
  testimonials: PublicTestimonial[];
  tenantStats?: TenantStats;
  /** Podrazumevano `salon.landingStructure`. */
  landingStructure?: LandingStructure;
}

/**
 * Prelazni izvor: podaci su već u ruci (server komponenta ih je povukla), pa
 * loader ne pokreće nijedan nov upit. Ovo je ono što drži T2A obećanje o
 * nepromenjenoj brzini.
 */
export function preloadedBlockDataSource(
  snapshot: PreloadedTenantSnapshot,
): BlockDataSource {
  const ls = snapshot.landingStructure ?? snapshot.salon.landingStructure;
  return createBlockDataSource({
    landingStructure: async () => ls,
    salon: async () => snapshot.salon,
    services: async () => snapshot.services,
    testimonials: async () => snapshot.testimonials,
    tenantStats: async () => snapshot.tenantStats,
  });
}
