/**
 * lib/platform/blocks/render-types.ts — kontrakt JEDNOG server prolaza.
 *
 * Odvojeno od `types.ts` namerno: registry zna šta je blok (shema, loader,
 * capability), a ovo zna šta se sa blokom desilo tokom konkretnog renderovanja
 * (učitan / preskočen / odakle je došao).
 *
 * Fajl nema nijednu runtime zavisnost, pa ga i klijentske komponente uvoze bez
 * povlačenja zod-a i loadera u bundle.
 */

import type {
  BlockConfigByType,
  BlockDataByType,
  FeatureBlockType,
} from "./types";

export type BlockSkipReason =
  | "unknown_block_type"
  | "unsupported_schema_version"
  | "invalid_config"
  | "loader_failed"
  /** Blok postoji u dokumentu, ali server prolaz nije ostavio podatke za njega. */
  | "missing_data"
  /** Tema nema renderer za taj tip (npr. tema bez booking sekcije). */
  | "missing_renderer"
  /** Compat putanja pozvana za par (tema, sekcija) koji nije u inventaru. */
  | "legacy_always_not_allowed";

export interface BlockSkipEvent {
  reason: BlockSkipReason;
  type: string;
  blockId?: string;
  theme: string;
  detail?: string;
}

/** Skip nikad ne obara stranu — samo se prijavi (spec 5.1). */
export type BlockTelemetry = (event: BlockSkipEvent) => void;

export interface ResolvedBlock<K extends FeatureBlockType = FeatureBlockType> {
  id: string;
  type: K;
  schemaVersion: number;
  config: BlockConfigByType[K];
  data: BlockDataByType[K];
  /**
   * Postavljeno samo za blok koji NIJE došao iz dokumenta. Provenijencija služi
   * telemetriji i reviziji (u T2A: `legacy-always`) — renderer je ne dobija,
   * jer bi prikaz koji zavisi od porekla bloka bio promena ponašanja.
   */
  origin?: string;
}

export type ResolvedBlockMap = Record<string, ResolvedBlock>;
