/**
 * FeatureBlockRegistry — javni ulaz (T2A korak 4).
 *
 * Potrošači uvoze SAMO odavde, isti obrazac kao `diagnostic-client` /
 * `theme-client`: sutra registry može da se preseli u paket, a pozivaoci se ne
 * diraju.
 *
 * Sloj po sloj:
 *   types.ts         kontrakt registry-ja (config, podaci, loader, capability)
 *   render-types.ts  kontrakt jednog prolaza (ResolvedBlock, telemetrija)
 *   definitions.ts   deset blokova iz spec 6
 *   registry.ts      lookup + BlockTypeResolver za engine
 *   deps.ts          request-scoped izvor podataka (dedupe)
 *   resolve.ts       paralelni server prolaz
 */

export type {
  BaseBlockConfig,
  BlockConfigByType,
  BlockDataByType,
  BlockDataSource,
  BlockLoaderContext,
  BookingServicesData,
  ContentAboutData,
  ContentBlogData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ContentPerksData,
  ContentTeamData,
  ContentTestimonialsData,
  FeatureBlockDefinition,
  FeatureBlockType,
  GalleryBlockConfig,
  GalleryVariant,
  HeroBlockConfig,
  ServicesCatalogData,
} from "./types";

export type {
  BlockSkipEvent,
  BlockSkipReason,
  BlockTelemetry,
  ResolvedBlock,
  ResolvedBlockMap,
} from "./render-types";

export { FEATURE_BLOCK_DEFINITIONS } from "./definitions";
export {
  FEATURE_BLOCK_REGISTRY,
  createFeatureBlockRegistry,
  type FeatureBlockRegistry,
} from "./registry";
export {
  createBlockDataSource,
  preloadedBlockDataSource,
  type BlockDataFetchers,
  type PreloadedTenantSnapshot,
} from "./deps";
export { resolveBlockData, type ResolveBlockDataOptions } from "./resolve";
