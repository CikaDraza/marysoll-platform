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
import type { MappedBlogPost } from "@/lib/tenant/blogPosts";
import type { PublicEducationSummary } from "@/lib/education/publicContent";
import type { EducationTaxonomy } from "@/lib/education/taxonomy";
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
  /** Lenj i po `limit`-u memoizovan; podrazumevano prazno (tema bez bloga). */
  blogPosts?: (limit: number) => Promise<MappedBlogPost[]>;
  educationDiscovery?: () => Promise<{
    items: PublicEducationSummary[];
    taxonomy: EducationTaxonomy | null;
  } | null>;
}

/** `once()` po argumentu — dva bloka sa istim `limit`-om dele isti promise. */
function onceByLimit<T>(
  fn: (limit: number) => Promise<T>,
): (limit?: number) => Promise<T> {
  const pending = new Map<number, Promise<T>>();
  return (limit = DEFAULT_BLOG_LIMIT) => {
    const hit = pending.get(limit);
    if (hit) return hit;
    const started = fn(limit);
    pending.set(limit, started);
    return started;
  };
}

const DEFAULT_BLOG_LIMIT = 3;

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
    blogPosts: onceByLimit(fetchers.blogPosts ?? (async () => [])),
    educationDiscovery: once(fetchers.educationDiscovery ?? (async () => null)),
  };
}

export interface PreloadedTenantSnapshot {
  salon: SalonProfileData;
  services: IService[];
  testimonials: PublicTestimonial[];
  tenantStats?: TenantStats;
  /** Podrazumevano `salon.landingStructure`. */
  landingStructure?: LandingStructure;
  /**
   * Objave se NE prosleđuju kao gotova vrednost nego kao funkcija: strana ne
   * zna unapred da li tema uopšte ima blog blok, a lenj poziv znači da teme bez
   * njega ne plaćaju upit.
   */
  blogPosts?: (limit: number) => Promise<MappedBlogPost[]>;
  educationDiscovery?: () => Promise<{
    items: PublicEducationSummary[];
    taxonomy: EducationTaxonomy | null;
  } | null>;
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
    blogPosts: snapshot.blogPosts,
    educationDiscovery: snapshot.educationDiscovery,
  });
}
